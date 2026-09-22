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
          `FFmpeg encerrou com codigo ${codigo}: ${erro.slice(-2000)}`
        )
      );
    });
  });
}

function normalizarUrl(valor: string): string {
  let link = valor.trim();

  if (link.startsWith("<") && link.endsWith(">")) {
    link = link.slice(1, -1);
  }

  const url = new URL(link);

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("O link precisa comecar com http:// ou https://.");
  }

  return url.toString();
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

async function baixarGif(url: string): Promise<Buffer> {
  const tentativas: Array<Record<string, string>> = [
    {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140.0 Safari/537.36",
      Accept: "image/gif,image/webp,image/*,*/*;q=0.8",
    },
    {
      "User-Agent": "Discordbot/2.0",
      Accept: "image/gif,image/*,*/*",
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

      const tamanhoInformado = Number(
        resposta.headers.get("content-length") || "0"
      );

      if (tamanhoInformado > MAX_DOWNLOAD_BYTES) {
        throw new Error("O GIF original ultrapassa 100 MB.");
      }

      const contentType =
        resposta.headers.get("content-type")?.toLowerCase() || "";

      if (
        contentType.includes("text/html") ||
        contentType.includes("application/json")
      ) {
        ultimoErro = "o link retornou uma pagina, nao um GIF";
        continue;
      }

      const arrayBuffer = await resposta.arrayBuffer();

      if (arrayBuffer.byteLength > MAX_DOWNLOAD_BYTES) {
        throw new Error("O GIF original ultrapassa 100 MB.");
      }

      const buffer = Buffer.from(arrayBuffer);

      const assinatura = buffer.subarray(0, 6).toString("ascii");

      if (assinatura !== "GIF87a" && assinatura !== "GIF89a") {
        ultimoErro = "o link nao retornou um GIF real";
        continue;
      }

      return buffer;
    } catch (error) {
      ultimoErro =
        error instanceof Error ? error.message : String(error);
    }
  }

  throw new Error(
    `Nao consegui baixar esse GIF. Ultimo erro: ${ultimoErro}.`
  );
}

async function gerarGif(
  entrada: string,
  topo: string,
  saida: string,
  config: Compressao,
  alturaTopo: number
): Promise<void> {
  const filtro =
    `[0:v]fps=${config.fps},` +
    `scale='min(${config.largura},iw)':-2:flags=lanczos,` +
    `pad=iw:ih+${alturaTopo}:0:${alturaTopo}:color=white[base];` +
    `[1:v][base]scale2ref=w=main_w:h=${alturaTopo}[top][base2];` +
    `[base2][top]overlay=0:0:shortest=1[merged];` +
    `[merged]split[a][b];` +
    `[a]palettegen=max_colors=${config.cores}:stats_mode=diff[p];` +
    `[b][p]paletteuse=dither=bayer:bayer_scale=5`;

  await executarFFmpeg([
    "-y",
    "-i",
    entrada,
    "-loop",
    "1",
    "-i",
    topo,
    "-filter_complex",
    filtro,
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
    .setDescription("Adiciona uma mensagem em cima de um GIF.")
    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("Cole o link direto do GIF")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("texto")
        .setDescription("Mensagem que aparecera em cima do GIF")
        .setRequired(true)
        .setMaxLength(250)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const link = interaction.options.getString("link", true);
    const texto = interaction.options.getString("texto", true);

    const pasta = await fs.mkdtemp(
      path.join(os.tmpdir(), "capivarudo-gif-")
    );

    const entrada = path.join(pasta, "entrada.gif");
    const topo = path.join(pasta, "topo.png");

    try {
      const url = normalizarUrl(link);
      const buffer = await baixarGif(url);

      await fs.writeFile(entrada, buffer);

      const metadata = await sharp(buffer, {
        animated: true,
      }).metadata();

      if (!metadata.width) {
        throw new Error("Nao consegui identificar o tamanho do GIF.");
      }

      const larguraBase = Math.min(metadata.width, 800);

      const tamanhoFonte = Math.max(
        22,
        Math.min(50, Math.round(larguraBase / 10))
      );

      const maxChars = Math.max(
        12,
        Math.floor(larguraBase / (tamanhoFonte * 0.55))
      );

      const linhas = quebrarTexto(texto, maxChars);

      const alturaLinha = Math.round(tamanhoFonte * 1.15);

      const alturaTopo = Math.max(
        100,
        linhas.length * alturaLinha + 40
      );

      const inicioY = Math.round(
        alturaTopo / 2 -
          ((linhas.length - 1) * alturaLinha) / 2
      );

      const spans = linhas
        .map(
          (linha, index) =>
            `<tspan x="50%" dy="${
              index === 0 ? 0 : alturaLinha
            }">${escapeXml(linha)}</tspan>`
        )
        .join("");

      const svg = `
<svg
  width="${larguraBase}"
  height="${alturaTopo}"
  xmlns="http://www.w3.org/2000/svg"
>
  <rect width="100%" height="100%" fill="white"/>

  <text
    x="50%"
    y="${inicioY}"
    text-anchor="middle"
    dominant-baseline="middle"
    font-family="Arial, sans-serif"
    font-size="${tamanhoFonte}"
    font-weight="900"
    fill="black"
  >
    ${spans}
  </text>
</svg>`;

      await sharp(Buffer.from(svg))
        .png()
        .toFile(topo);

      const tentativas: Compressao[] = [
        {
          largura: larguraBase,
          fps: 20,
          cores: 128,
        },
        {
          largura: Math.min(larguraBase, 640),
          fps: 15,
          cores: 128,
        },
        {
          largura: Math.min(larguraBase, 520),
          fps: 12,
          cores: 96,
        },
        {
          largura: Math.min(larguraBase, 420),
          fps: 10,
          cores: 80,
        },
        {
          largura: Math.min(larguraBase, 360),
          fps: 8,
          cores: 64,
        },
        {
          largura: Math.min(larguraBase, 300),
          fps: 6,
          cores: 48,
        },
      ];

      let resultado: Buffer | null = null;

      for (let i = 0; i < tentativas.length; i++) {
        const config = tentativas[i];

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

        const arquivo = await fs.readFile(saida);

        console.log(
          `[GIF] tentativa ${i + 1}: ` +
            `${config.largura}px | ` +
            `${config.fps} FPS | ` +
            `${config.cores} cores | ` +
            `${(arquivo.length / 1024 / 1024).toFixed(2)} MB`
        );

        resultado = arquivo;

        if (arquivo.length <= TARGET_SIZE_BYTES) {
          break;
        }
      }

      if (!resultado) {
        throw new Error("Nao foi possivel gerar o GIF.");
      }

      if (resultado.length > TARGET_SIZE_BYTES) {
        await interaction.editReply(
          "❌ Esse GIF e muito longo ou pesado. Mesmo depois de comprimir bastante, ele continuou grande demais."
        );
        return;
      }

      const anexo = new AttachmentBuilder(resultado, {
        name: "capivarudo.gif",
      });

      try {
        await interaction.editReply({
          files: [anexo],
        });
      } catch (error) {
        console.error("[GIF UPLOAD]", error);

        await interaction.editReply(
          "❌ O GIF foi criado, mas o Discord recusou o tamanho do arquivo."
        );
      }
    } catch (error) {
      console.error("[GIF]", error);

      const motivo =
        error instanceof Error
          ? error.message
          : "Erro desconhecido";

      await interaction.editReply(
        `❌ Nao consegui processar esse GIF.\n\n**Motivo:** ${motivo}\n\nUse um link direto para o GIF. Se ele estiver no Discord, use **Copiar link** no proprio GIF.`
      );
    } finally {
      await fs
        .rm(pasta, {
          recursive: true,
          force: true,
        })
        .catch(() => {});
    }
  },
};

export default command;
