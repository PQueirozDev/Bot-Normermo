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

// Limite de seguranca para nao estourar memoria do Railway.
// Nao e o limite de upload do Discord.
const MAX_DOWNLOAD_BYTES = 100 * 1024 * 1024;

function escapeXml(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function quebrarTexto(texto: string, maxChars: number) {
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

function executarFFmpeg(args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const processo = spawn(ffmpegPath, args);

    let erro = "";

    processo.stderr.on("data", (data) => {
      erro += data.toString();
    });

    processo.on("error", reject);

    processo.on("close", (codigo) => {
      if (codigo === 0) {
        resolve();
      } else {
        reject(
          new Error(`FFmpeg encerrou com codigo ${codigo}\n${erro}`)
        );
      }
    });
  });
}

function normalizarLink(link: string) {
  let url = link.trim();

  // Permite link colado entre < >
  if (url.startsWith("<") && url.endsWith(">")) {
    url = url.slice(1, -1);
  }

  const parsed = new URL(url);

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("Protocolo invalido.");
  }

  return parsed.toString();
}

async function baixarMidia(url: string) {
  const resposta = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 Capivarudo/1.0",
      Accept: "image/gif,image/*;q=0.9,*/*;q=0.8",
    },
  });

  if (!resposta.ok) {
    throw new Error(
      `Nao foi possivel baixar o link. HTTP ${resposta.status}`
    );
  }

  const tamanhoHeader = Number(
    resposta.headers.get("content-length") || "0"
  );

  if (tamanhoHeader > MAX_DOWNLOAD_BYTES) {
    throw new Error("Arquivo muito grande.");
  }

  const contentType =
    resposta.headers.get("content-type")?.toLowerCase() || "";

  if (
    contentType.includes("text/html") ||
    contentType.includes("application/json")
  ) {
    throw new Error(
      "Esse endereco e uma pagina, e nao um link direto para a imagem/GIF."
    );
  }

  const arrayBuffer = await resposta.arrayBuffer();

  if (arrayBuffer.byteLength > MAX_DOWNLOAD_BYTES) {
    throw new Error("Arquivo muito grande.");
  }

  const buffer = Buffer.from(arrayBuffer);

  // GIF comeca com GIF87a ou GIF89a.
  const assinatura = buffer.subarray(0, 6).toString("ascii");

  const gifReal =
    assinatura === "GIF87a" ||
    assinatura === "GIF89a";

  if (!gifReal) {
    throw new Error(
      "O link nao retornou um GIF real."
    );
  }

  return buffer;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("gif")
    .setDescription("Coloca uma mensagem em cima de um GIF.")
    .addStringOption((option) =>
      option
        .setName("link")
        .setDescription("Cole aqui o link direto do GIF")
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

    const pastaTemp = await fs.mkdtemp(
      path.join(os.tmpdir(), "capivarudo-gif-")
    );

    const entrada = path.join(pastaTemp, "entrada.gif");
    const topo = path.join(pastaTemp, "topo.png");
    const saida = path.join(pastaTemp, "resultado.gif");

    try {
      const gifUrl = normalizarLink(link);

      const buffer = await baixarMidia(gifUrl);

      await fs.writeFile(entrada, buffer);

      const metadata = await sharp(buffer, {
        animated: true,
      }).metadata();

      const larguraOriginal = metadata.width;

      if (!larguraOriginal) {
        throw new Error(
          "Nao foi possivel identificar o tamanho do GIF."
        );
      }

      // Evita GIF gigante consumir memoria demais.
      const larguraFinal = Math.min(
        900,
        Math.max(320, larguraOriginal)
      );

      const tamanhoFonte = Math.max(
        24,
        Math.min(54, Math.round(larguraFinal / 10))
      );

      const maxChars = Math.max(
        12,
        Math.floor(larguraFinal / (tamanhoFonte * 0.55))
      );

      const linhas = quebrarTexto(texto, maxChars);

      const alturaLinha = Math.round(tamanhoFonte * 1.15);

      const alturaTopo = Math.max(
        110,
        linhas.length * alturaLinha + 45
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
          width="${larguraFinal}"
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
            y="${Math.round(
              alturaTopo / 2 -
              ((linhas.length - 1) * alturaLinha) / 2
            )}"
            text-anchor="middle"
            dominant-baseline="middle"
            font-family="Arial, sans-serif"
            font-size="${tamanhoFonte}"
            font-weight="900"
            fill="black"
          >
            ${spans}
          </text>
        </svg>
      `;

      await sharp(Buffer.from(svg))
        .png()
        .toFile(topo);

      await executarFFmpeg([
        "-y",
        "-i",
        entrada,
        "-loop",
        "1",
        "-i",
        topo,

        "-filter_complex",
        `[0:v]scale=${larguraFinal}:-1:flags=lanczos,pad=iw:ih+${alturaTopo}:0:${alturaTopo}:color=white[gif];[gif][1:v]overlay=0:0:shortest=1[merged];[merged]split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=sierra2_4a`,

        "-an",
        "-f",
        "gif",
        saida,
      ]);

      const resultado = await fs.readFile(saida);

      const anexo = new AttachmentBuilder(resultado, {
        name: "capivarudo.gif",
      });

      try {
        await interaction.editReply({
          files: [anexo],
        });
      } catch (uploadError) {
        console.error("[GIF UPLOAD]", uploadError);

        await interaction.editReply(
          "❌ O GIF foi criado, mas ficou maior do que o Discord permite enviar neste servidor."
        );
      }
    } catch (error) {
      console.error("[GIF]", error);

      const motivo =
        error instanceof Error
          ? error.message
          : "Erro desconhecido";

      await interaction.editReply(
        `❌ Nao consegui processar esse GIF.\n\n**Motivo:** ${motivo}\n\nTente usar **Copiar link** diretamente no GIF/imagem, e nao o link de uma pagina.`
      );
    } finally {
      await fs.rm(pastaTemp, {
        recursive: true,
        force: true,
      }).catch(() => {});
    }
  },
};

export default command;
