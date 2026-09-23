import {
  AttachmentBuilder,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { spawn } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import sharp from "sharp";
import { Command } from "../types";

const ffmpegPath = require("ffmpeg-static") as string;

const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;
const TARGET_SIZE_BYTES = 7.5 * 1024 * 1024;

type Compressao = {
  largura: number;
  fps: number;
  cores: number;
};

type MidiaBaixada = {
  buffer: Buffer;
  tipo: "gif" | "video";
};

function escapeXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function quebrarTexto(texto: string, maxChars: number): string[] {
  const palavras = texto.trim().split(/\s+/);
  const linhas: string[] = [];

  let atual = "";

  for (const palavra of palavras) {
    const teste = atual ? `${atual} ${palavra}` : palavra;

    if (teste.length <= maxChars) {
      atual = teste;
    } else {
      if (atual) linhas.push(atual);
      atual = palavra;
    }
  }

  if (atual) linhas.push(atual);

  return linhas.slice(0, 5);
}

function executarFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const processo = spawn(ffmpegPath, args);

    let erro = "";

    processo.stderr.on("data", (data) => {
      erro += data.toString();
    });

    processo.on("error", reject);

    processo.on("close", (codigo) => {
      if (codigo === 0) {
        resolve();
        return;
      }

      reject(
        new Error(
          `FFmpeg encerrou com codigo ${codigo}: ${erro.slice(-2500)}`
        )
      );
    });
  });
}

function limparLink(valor: string): string {
  let link = valor.trim();

  if (link.startsWith("<") && link.endsWith(">")) {
    link = link.slice(1, -1);
  }

  return link;
}

function extrairIdsMensagem(
  link: string
): { guildId: string; channelId: string; messageId: string } | null {
  const limpo = limparLink(link);

  const match = limpo.match(
    /^https?:\/\/(?:(?:ptb|canary)\.)?(?:discord\.com|discordapp\.com)\/channels\/(\d+)\/(\d+)\/(\d+)/
  );

  if (!match) {
    return null;
  }

  return {
    guildId: match[1],
    channelId: match[2],
    messageId: match[3],
  };
}

function pareceGif(url: string): boolean {
  const semQuery = url.split("?")[0].toLowerCase();

  return (
    semQuery.endsWith(".gif") ||
    url.includes("media.discordapp.net") ||
    url.includes("cdn.discordapp.com")
  );
}

async function obterGifDaMensagem(
  interaction: ChatInputCommandInteraction,
  link: string
): Promise<string | null> {
  const ids = extrairIdsMensagem(link);

  if (!ids) {
    return null;
  }

  if (
    interaction.guildId &&
    ids.guildId !== interaction.guildId
  ) {
    throw new Error(
      "O link da mensagem pertence a outro servidor."
    );
  }

  const canal = await interaction.client.channels.fetch(
    ids.channelId
  );

  if (
    !canal ||
    !canal.isTextBased() ||
    !("messages" in canal)
  ) {
    throw new Error(
      "Nao consegui acessar o canal dessa mensagem."
    );
  }

  const mensagem = await canal.messages.fetch(
    ids.messageId
  );

  // 1. Procura anexos enviados diretamente
  for (const anexo of mensagem.attachments.values()) {
    if (
      anexo.contentType?.includes("image/gif") ||
      anexo.name?.toLowerCase().endsWith(".gif") ||
      pareceGif(anexo.url)
    ) {
      return anexo.url;
    }
  }

  // 2. Procura imagem/GIF nos embeds
  for (const embed of mensagem.embeds) {
    const candidatos = [
      embed.image?.url,
      embed.thumbnail?.url,
      embed.url,
    ].filter(
      (url): url is string => Boolean(url)
    );

    for (const url of candidatos) {
      if (pareceGif(url)) {
        return url;
      }
    }
  }

  // 3. Procura video animado em embeds (Klipy, Tenor e similares)
  for (const embed of mensagem.embeds) {
    if (embed.video?.url) {
      console.log("[GIF] Video encontrado no embed:", embed.video.url);
      return embed.video.url;
    }
  }

  // 4. Procura URLs no texto da mensagem
  const urls = mensagem.content.match(
    /https?:\/\/[^\s<>]+/g
  );

  if (urls) {
    for (const url of urls) {
      if (pareceGif(url)) {
        return url;
      }
    }
  }

  throw new Error(
    "Encontrei a mensagem, mas nao encontrei nenhum GIF nela."
  );
}

async function fetchComTimeout(
  url: string,
  headers: Record<string, string>
): Promise<Response> {
  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, 25000);

  try {
    return await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function baixarMidia(urlOriginal: string): Promise<MidiaBaixada> {
  const url = limparLink(urlOriginal);
  const parsed = new URL(url);

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("O endereco da midia nao e valido.");
  }

  const tentativas: Array<Record<string, string>> = [
    {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36",
      Accept: "image/gif,video/mp4,video/webm,image/webp,image/*,video/*,*/*;q=0.8",
    },
    {
      "User-Agent": "Discordbot/2.0",
      Accept: "image/gif,video/mp4,video/*,image/*,*/*",
    },
    {
      "User-Agent": "Mozilla/5.0",
      Accept: "*/*",
      Referer: "https://discord.com/",
    },
  ];

  let ultimoErro = "erro desconhecido";

  for (const headers of tentativas) {
    try {
      const resposta = await fetchComTimeout(url, headers);

      if (!resposta.ok) {
        ultimoErro = `HTTP ${resposta.status}`;
        continue;
      }

      const tamanhoInformado = Number(resposta.headers.get("content-length") || "0");
      if (tamanhoInformado > MAX_DOWNLOAD_BYTES) {
        throw new Error("A midia original ultrapassa 100 MB.");
      }

      const arrayBuffer = await resposta.arrayBuffer();
      if (arrayBuffer.byteLength > MAX_DOWNLOAD_BYTES) {
        throw new Error("A midia original ultrapassa 100 MB.");
      }

      const buffer = Buffer.from(arrayBuffer);
      const assinaturaGif = buffer.subarray(0, 6).toString("ascii");
      const ehGif = assinaturaGif === "GIF87a" || assinaturaGif === "GIF89a";
      const contentType = (resposta.headers.get("content-type") || "").toLowerCase();
      const ehMp4 = buffer.length >= 12 && buffer.subarray(4, 8).toString("ascii") === "ftyp";
      const ehVideo = ehMp4 || contentType.startsWith("video/");

      if (ehGif) return { buffer, tipo: "gif" };
      if (ehVideo) return { buffer, tipo: "video" };

      ultimoErro = `o endereco retornou ${contentType || "um formato desconhecido"}, nao um GIF/video`;
    } catch (error) {
      ultimoErro = error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(`Nao consegui baixar a midia. Ultimo erro: ${ultimoErro}.`);
}

async function gerarGif(
  entrada: string,
  topo: string,
  saida: string,
  config: Compressao,
  alturaTopo: number
): Promise<void> {
  const filtro =
    `[0:v]fps=${config.fps},scale=${config.largura}:-2:flags=lanczos[gif];` +
    `[1:v]scale=${config.largura}:${alturaTopo}:flags=lanczos[top];` +
    `[top][gif]vstack=inputs=2[stack];` +
    `[stack]split[a][b];` +
    `[a]palettegen=max_colors=${config.cores}:stats_mode=diff[p];` +
    `[b][p]paletteuse=dither=bayer:bayer_scale=5[out]`;

  await executarFFmpeg([
    "-y",
    "-i",
    entrada,
    "-i",
    topo,
    "-filter_complex",
    filtro,
    "-map",
    "[out]",
    "-an",
    "-loop",
    "0",
    "-f",
    "gif",
    saida,
  ]);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("gif")
    .setDescription(
      "Adiciona uma mensagem em cima de um GIF."
    )
    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription(
          "Link da mensagem do Discord ou link direto do GIF"
        )
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("texto")
        .setDescription(
          "Mensagem que aparecera em cima do GIF"
        )
        .setRequired(true)
        .setMaxLength(250)
    ),

  async execute(
    interaction: ChatInputCommandInteraction
  ) {
    await interaction.deferReply();

    const linkRecebido =
      interaction.options.getString(
        "link",
        true
      );

    const texto =
      interaction.options.getString(
        "texto",
        true
      );

    const pasta = await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        "capivarudo-gif-"
      )
    );

    let entrada = path.join(
      pasta,
      "entrada.gif"
    );

    const topo = path.join(
      pasta,
      "topo.png"
    );

    try {
      let urlGif = limparLink(
        linkRecebido
      );

      const idsMensagem =
        extrairIdsMensagem(urlGif);

      if (idsMensagem) {
        const encontrada =
          await obterGifDaMensagem(
            interaction,
            urlGif
          );

        if (!encontrada) {
          throw new Error(
            "Nao encontrei um GIF nessa mensagem."
          );
        }

        urlGif = encontrada;
      }

      console.log(
        `[GIF] URL encontrada: ${urlGif}`
      );

      const midia = await baixarMidia(urlGif);
      const buffer = midia.buffer;

      entrada = path.join(
        pasta,
        midia.tipo === "video" ? "entrada.mp4" : "entrada.gif"
      );

      await fs.writeFile(entrada, buffer);

      let larguraBase = 800;

      if (midia.tipo === "gif") {
        const metadata = await sharp(buffer, { animated: true }).metadata();
        if (!metadata.width) {
          throw new Error("Nao consegui identificar o tamanho do GIF.");
        }
        larguraBase = Math.min(metadata.width, 800);
      }

      console.log(`[GIF] Midia detectada: ${midia.tipo} | largura base ${larguraBase}px`);

      const tamanhoFonte = Math.max(
        22,
        Math.min(
          50,
          Math.round(
            larguraBase / 10
          )
        )
      );

      const maxChars = Math.max(
        12,
        Math.floor(
          larguraBase /
            (tamanhoFonte * 0.55)
        )
      );

      const linhas = quebrarTexto(
        texto,
        maxChars
      );

      const alturaLinha =
        Math.round(
          tamanhoFonte * 1.15
        );

      const alturaTopo = Math.max(
        100,
        linhas.length *
          alturaLinha +
          40
      );

      const inicioY = Math.round(
        alturaTopo / 2 -
          ((linhas.length - 1) *
            alturaLinha) /
            2
      );

      const spans = linhas
        .map(
          (linha, index) =>
            `<tspan x="50%" dy="${
              index === 0
                ? 0
                : alturaLinha
            }">${escapeXml(
              linha
            )}</tspan>`
        )
        .join("");

      const svg = `
<svg
  width="${larguraBase}"
  height="${alturaTopo}"
  xmlns="http://www.w3.org/2000/svg"
>
  <rect
    width="100%"
    height="100%"
    fill="white"
  />

  <text
    x="50%"
    y="${inicioY}"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="DejaVu Sans, sans-serif"
    font-size="${tamanhoFonte}"
    font-weight="900"
    fill="black"
  >
    ${spans}
  </text>
</svg>`;

      await sharp(
        Buffer.from(svg)
      )
        .png()
        .toFile(topo);

      const tentativas: Compressao[] = [
        {
          largura: larguraBase,
          fps: 20,
          cores: 128,
        },
        {
          largura: Math.min(
            larguraBase,
            640
          ),
          fps: 15,
          cores: 128,
        },
        {
          largura: Math.min(
            larguraBase,
            520
          ),
          fps: 12,
          cores: 96,
        },
        {
          largura: Math.min(
            larguraBase,
            420
          ),
          fps: 10,
          cores: 80,
        },
        {
          largura: Math.min(
            larguraBase,
            360
          ),
          fps: 8,
          cores: 64,
        },
        {
          largura: Math.min(
            larguraBase,
            300
          ),
          fps: 6,
          cores: 48,
        },
      ];

      let resultado: Buffer | null =
        null;

      for (
        let i = 0;
        i < tentativas.length;
        i++
      ) {
        const config =
          tentativas[i];

        const saida = path.join(
          pasta,
          `resultado-${i}.gif`
        );

        await gerarGif(
          entrada,
          topo,
          saida,
          config,
          alturaTopo
        );

        const arquivo =
          await fs.readFile(
            saida
          );

        console.log(
          `[GIF] tentativa ${
            i + 1
          }: ` +
            `${config.largura}px | ` +
            `${config.fps} FPS | ` +
            `${config.cores} cores | ` +
            `${(
              arquivo.length /
              1024 /
              1024
            ).toFixed(2)} MB`
        );

        resultado = arquivo;

        if (
          arquivo.length <=
          TARGET_SIZE_BYTES
        ) {
          break;
        }
      }

      if (!resultado) {
        throw new Error(
          "Nao foi possivel gerar o GIF."
        );
      }

      if (
        resultado.length >
        TARGET_SIZE_BYTES
      ) {
        await interaction.editReply(
          "❌ O GIF continuou muito grande mesmo depois da compressao."
        );

        return;
      }

      const anexo =
        new AttachmentBuilder(
          resultado,
          {
            name: "capivarudo.gif",
          }
        );

      await interaction.editReply({
        files: [anexo],
      });
    } catch (error) {
      console.error(
        "[GIF]",
        error
      );

      const motivo =
        error instanceof Error
          ? error.message
          : "Erro desconhecido";

      await interaction.editReply(
        `❌ Nao consegui processar esse GIF.\n\n**Motivo:** ${motivo}\n\nPara GIFs enviados no Discord, use **Copiar link da mensagem** e cole no campo \`link\`.`
      );
    } finally {
      await fs.rm(
        pasta,
        {
          recursive: true,
          force: true,
        }
      ).catch(() => {});
    }
  },
};

export default command;
