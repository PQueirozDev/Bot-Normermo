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

  return linhas.slice(0, 4);
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
        reject(new Error(`FFmpeg encerrou com codigo ${codigo}\n${erro}`));
      }
    });
  });
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName("gif")
    .setDescription("Adiciona uma frase em cima de um GIF.")
    .addAttachmentOption((option) =>
      option
        .setName("arquivo")
        .setDescription("GIF que sera editado")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("texto")
        .setDescription("Texto que aparecera em cima do GIF")
        .setRequired(true)
        .setMaxLength(180)
    ),

  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.deferReply();

    const arquivo = interaction.options.getAttachment("arquivo", true);
    const texto = interaction.options.getString("texto", true);

    const nome = arquivo.name?.toLowerCase() ?? "";

    if (
      arquivo.contentType !== "image/gif" &&
      !nome.endsWith(".gif")
    ) {
      await interaction.editReply(
        "❌ O arquivo precisa ser um GIF."
      );
      return;
    }

    if (arquivo.size > 15 * 1024 * 1024) {
      await interaction.editReply(
        "❌ Esse GIF e muito grande. Envie um GIF de ate 15 MB."
      );
      return;
    }

    const pastaTemp = await fs.mkdtemp(
      path.join(os.tmpdir(), "capivarudo-gif-")
    );

    const entrada = path.join(pastaTemp, "entrada.gif");
    const topo = path.join(pastaTemp, "topo.png");
    const saida = path.join(pastaTemp, "resultado.gif");

    try {
      const resposta = await fetch(arquivo.url);

      if (!resposta.ok) {
        throw new Error("Nao foi possivel baixar o GIF.");
      }

      const buffer = Buffer.from(await resposta.arrayBuffer());

      await fs.writeFile(entrada, buffer);

      const metadata = await sharp(buffer, {
        animated: true,
      }).metadata();

      const largura = metadata.width;

      if (!largura) {
        throw new Error("Nao foi possivel descobrir o tamanho do GIF.");
      }

      const larguraFinal = Math.max(320, largura);

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
        <svg width="${larguraFinal}" height="${alturaTopo}"
             xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="white"/>
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
            fill="black">
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

      if (resultado.length > 24 * 1024 * 1024) {
        await interaction.editReply(
          "❌ O GIF final ficou grande demais para enviar pelo Discord."
        );
        return;
      }

      const anexo = new AttachmentBuilder(resultado, {
        name: "capivarudo.gif",
      });

      await interaction.editReply({
        files: [anexo],
      });
    } catch (error) {
      console.error("[GIF]", error);

      await interaction.editReply(
        "❌ Nao consegui editar esse GIF."
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
