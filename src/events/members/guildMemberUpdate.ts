import { AuditLogEvent, Events, GuildMember } from "discord.js";
import { getGuildSettings } from "../../database/guildSettings";
import { buildLogEmbed, Colors } from "../../services/embedService";
import { sendLog } from "../../services/loggingService";
import { findAuditLogResponsible, formatResponsible } from "../../services/auditLogService";
import { formatFullDate } from "../../utils/time";

export default {
  name: Events.GuildMemberUpdate,
  async execute(oldMember: GuildMember, newMember: GuildMember) {
    const settings = await getGuildSettings(newMember.guild.id);
    const userTag = `${newMember.user.tag} (<@${newMember.id}>)`;

    // --- Nickname alterado ---
    if (oldMember.nickname !== newMember.nickname) {
      await sendLog(
        newMember.guild,
        settings,
        "member",
        buildLogEmbed({
          title: "🟡 Nickname alterado",
          color: Colors.updated,
          fields: [
            { name: "Usuário", value: userTag },
            { name: "Antes", value: oldMember.nickname ?? "*(nenhum)*", inline: true },
            { name: "Depois", value: newMember.nickname ?? "*(nenhum)*", inline: true },
          ],
        })
      );
    }

    // --- Cargos adicionados/removidos ---
    const addedRoles = newMember.roles.cache.filter((r) => !oldMember.roles.cache.has(r.id));
    const removedRoles = oldMember.roles.cache.filter((r) => !newMember.roles.cache.has(r.id));

    if (addedRoles.size > 0) {
      await sendLog(
        newMember.guild,
        settings,
        "member",
        buildLogEmbed({
          title: "🟡 Cargo(s) adicionado(s)",
          color: Colors.updated,
          fields: [
            { name: "Usuário", value: userTag },
            { name: "Cargos", value: addedRoles.map((r) => `<@&${r.id}>`).join(", ") },
          ],
        })
      );
    }

    if (removedRoles.size > 0) {
      await sendLog(
        newMember.guild,
        settings,
        "member",
        buildLogEmbed({
          title: "🟡 Cargo(s) removido(s)",
          color: Colors.updated,
          fields: [
            { name: "Usuário", value: userTag },
            { name: "Cargos", value: removedRoles.map((r) => `<@&${r.id}>`).join(", ") },
          ],
        })
      );
    }

    // --- Timeout aplicado/removido ---
    const oldTimeout = oldMember.communicationDisabledUntilTimestamp ?? null;
    const newTimeout = newMember.communicationDisabledUntilTimestamp ?? null;

    if (oldTimeout !== newTimeout) {
      const timeoutEntry = await findAuditLogResponsible(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
      const applied = newTimeout !== null && (newTimeout ?? 0) > Date.now();

      await sendLog(
        newMember.guild,
        settings,
        "member",
        buildLogEmbed({
          title: applied ? "⚠️ Timeout aplicado" : "🟡 Timeout removido",
          color: applied ? Colors.alert : Colors.updated,
          fields: [
            { name: "Usuário", value: userTag },
            ...(applied && newTimeout
              ? [{ name: "Até", value: formatFullDate(new Date(newTimeout)) }]
              : []),
            { name: "Responsável", value: formatResponsible(timeoutEntry) },
          ],
        })
      );
    }
  },
};
