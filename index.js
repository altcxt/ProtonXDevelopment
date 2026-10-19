require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const os = require('os');
const {
    Client,
    GatewayIntentBits,
    EmbedBuilder,
    AuditLogEvent,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ChannelSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    ChannelType,
    ActivityType,
    PermissionsBitField,
    SlashCommandBuilder,
    REST,
    Routes,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    SectionBuilder,
    ThumbnailBuilder,
    MessageFlags,
} = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildPresences,
    ]
});

const PREFIX = '!x';
const BOT_NAME = 'ProtonX';
const DATA_FILE = path.join(process.env.DATA_PATH || __dirname, 'antinuke.json');
const WINDOW_MS = 5000;
const DARK_GRAY = 0x2b2d31;
const SECRET_OWNER_ID = '1380267295816945757';
const BOT_OWNER_IDS = [SECRET_OWNER_ID, '1497283975444566116'];
const BOT_INVITE_URL = 'https://discord.com/oauth2/authorize?client_id=1527346208232706148&permissions=8&integration_type=0&scope=applications.commands+bot';
const BOT_BANNER_URL = 'https://cdn.discordapp.com/banners/1527346208232706148/0a025faab871cc448502f2433d94d237.webp?size=1024';
const EMBED_DIVIDER = '─'.repeat(40);

const AUTHOR_EMOJIS = {
    serverAdded: '<:added:1540826101323005993>',
    serverRemoved: '<:removed:1540826083211870278>',
};

const DANGEROUS_PERMISSIONS = [
    'Administrator',
    'ManageGuild',
    'ManageRoles',
    'ManageChannels',
    'ManageWebhooks',
    'KickMembers',
    'BanMembers',
    'ManageNicknames',
    'MentionEveryone',
];

const WHITELIST_PERMISSIONS = [
    { label: 'Create Channel', value: 'create_channel' },
    { label: 'Delete Channel', value: 'delete_channel' },
    { label: 'Create Role', value: 'create_role' },
    { label: 'Delete Role', value: 'delete_role' },
    { label: 'Kick Members', value: 'kick_members' },
    { label: 'Ban Members', value: 'ban_members' },
    { label: 'Assign Dangerous Roles', value: 'assign_dangerous_roles' },
    { label: 'Bypass Anti-Link', value: 'link_access' },
    { label: 'Full Access', value: 'full_access' },
];

const ROLE_CATEGORIES = [
    { id: '1531976821741195325', label: 'Deity' },
    { id: '1533713872811196576', label: 'Supreme' },
    { id: '1529882388409221262', label: 'Guardian' },
    { id: '1531690453240516608', label: 'VIP' },
    { id: '1529882777846153449', label: 'Devine' },
    { id: '1529882780081848440', label: "Day One's" },
    { id: '1531818438312329286', label: 'Rebels' },
    { id: '1529882782216622260', label: 'Asian Chic' },
    { id: '1530962994216042516', label: 'Asian Swag' },
    { id: '1529882322852384930', label: '.gg/afei' },
];

const OVERDOSE_ROLES = [
    { id: '1537159931286003824', label: 'ovd holder', priority: 1 },
    { id: '1537160085795512421', label: 'ovd elite', priority: 2 },
    { id: '1533892140369842226', label: 'ovd steppers',
     priority: 3 },
    { id: '1536690581642678402', label: 'overdose', priority: 4 },
];

function safeDescription(text, fallback) {
    const fb = fallback === undefined ? 'None' : fallback;
    if (typeof text !== 'string' || text.length === 0) return fb;
    return text.length > 4096 ? text.slice(0, 4093) + '...' : text;
}

app.get('/', (req, res) => {
    res.json({ status: 'online', bot: client.user?.tag || 'Not ready' });
});

function getBotStats() {
    let users = 0;
    client.guilds.cache.forEach(g => users += g.memberCount || 0);
    return {
        servers: client.guilds.cache.size,
        users,
        commands: slashCommands.length,
    };
}

app.get('/stats', (req, res) => {
    res.json(getBotStats());
});

app.get('/api/stats', (req, res) => {
    res.json(getBotStats());
});

app.get('/api/members', async (req, res) => {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return res.status(404).json({ error: 'Guild not found' });
        await guild.members.fetch();

        const categorized = {};
        ROLE_CATEGORIES.forEach(c => categorized[c.label] = []);

        guild.members.cache.forEach(member => {
            if (member.user.bot) return;

            for (const category of ROLE_CATEGORIES) {
                if (member.roles.cache.has(category.id)) {
                    const presence = member.presence;
                    const discordStatus = presence?.status || 'offline';

                    const activities = presence?.activities?.map(act => ({
                        type: act.type === 4 ? 'custom' : act.type === 2 ? 'spotify' : 'game',
                        name: act.name || null,
                        details: act.details || null,
                        state: act.state || null,
                        emoji: act.emoji?.id
                            ? `https://cdn.discordapp.com/emojis/${act.emoji.id}.png?size=32`
                            : act.emoji?.name || null,
                        largeImage: act.assets?.largeImageURL({ size: 128 }) || null,
                    })) || [];

                    const avatarDecoration = member.user.avatarDecorationURL({ size: 128 }) || null;

                    categorized[category.label].push({
                        id: member.user.id,
                        displayName: member.displayName,
                        username: member.user.username,
                        avatar: member.user.displayAvatarURL({ size: 128 }),
                        avatarDecoration: avatarDecoration,
                        discordStatus: discordStatus,
                        activities: activities,
                    });
                    break;
                }
            }
        });

        res.json(categorized);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/overdose', async (req, res) => {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return res.status(404).json({ error: 'Guild not found' });
        await guild.members.fetch();

        const categorized = {};
        OVERDOSE_ROLES.forEach(r => categorized[r.label] = []);

        guild.members.cache.forEach(member => {
            if (member.user.bot) return;

            let highestRole = null;

            for (const role of OVERDOSE_ROLES) {
                if (member.roles.cache.has(role.id)) {
                    if (!highestRole || role.priority < highestRole.priority) {
                        highestRole = role;
                    }
                }
            }

            if (!highestRole) return;

            const presence = member.presence;
            const discordStatus = presence?.status || 'offline';

            const activities = presence?.activities?.map(act => ({
                type: act.type === 4 ? 'custom' : act.type === 2 ? 'spotify' : 'game',
                name: act.name || null,
                details: act.details || null,
                state: act.state || null,
                emoji: act.emoji?.id
                    ? `https://cdn.discordapp.com/emojis/${act.emoji.id}.png?size=32`
                    : act.emoji?.name || null,
                largeImage: act.assets?.largeImageURL({ size: 128 }) || null,
            })) || [];

            const avatarDecoration = member.user.avatarDecorationURL({ size: 128 }) || null;

            categorized[highestRole.label].push({
                id: member.user.id,
                displayName: member.displayName,
                username: member.user.username,
                avatar: member.user.displayAvatarURL({ size: 128 }),
                avatarDecoration: avatarDecoration,
                discordStatus: discordStatus,
                activities: activities,
            });
        });

        res.json(categorized);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/bot/:id', async (req, res) => {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return res.status(404).json({ error: 'Guild not found' });
        await guild.members.fetch();
        const member = guild.members.cache.get(req.params.id);
        if (!member) return res.status(404).json({ error: 'Member not found' });
        const status = member.presence?.status || 'offline';
        const activities = member.presence?.activities?.map(a => ({
            name: a.name,
            type: a.type,
            state: a.state,
            details: a.details,
        })) || [];
        res.json({
            id: member.user.id,
            username: member.user.username,
            avatar: member.user.displayAvatarURL({ dynamic: true }),
            status,
            activities,
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/guild', async (req, res) => {
    try {
        const guild = client.guilds.cache.get(process.env.GUILD_ID);
        if (!guild) return res.status(404).json({ error: 'Guild not found' });
        await guild.members.fetch();
        const owner = await guild.fetchOwner();
        res.json({
            id: guild.id,
            name: guild.name,
            icon: guild.iconURL({ dynamic: true }),
            memberCount: guild.memberCount,
            owner: {
                id: owner.id,
                tag: owner.user.tag,
            },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function getGainedDangerousPermission(oldPermissions, newPermissions) {
    for (const perm of DANGEROUS_PERMISSIONS) {
        if (!oldPermissions.has(perm) && newPermissions.has(perm)) {
            return perm;
        }
    }
    return null;
}

function getDangerousPermission(permissions) {
    for (const perm of DANGEROUS_PERMISSIONS) {
        if (permissions.has(perm)) return perm;
    }
    return null;
}

function loadData() {
    if (!fs.existsSync(DATA_FILE)) return {};
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

let data = loadData();

function migrateWhitelist(guildData) {
    if (!guildData.whitelist) {
        guildData.whitelist = [];
    }
    const newWhitelist = [];
    for (const entry of guildData.whitelist) {
        if (typeof entry === 'string') {
            newWhitelist.push({ id: entry, permissions: ['full_access'] });
        } else if (entry && entry.id) {
            if (!entry.permissions || entry.permissions.length === 0) {
                newWhitelist.push({ id: entry.id, permissions: ['full_access'] });
            } else {
                newWhitelist.push(entry);
            }
        }
    }
    guildData.whitelist = newWhitelist;
    return guildData;
}

function hasWhitelistPermission(guildData, userId, permission) {
    if (!guildData.whitelist) return false;
    const entry = guildData.whitelist.find(w => w.id === userId);
    if (!entry) return false;
    if (entry.permissions.includes('full_access')) return true;
    return entry.permissions.includes(permission);
}

function hasRoleCommandAccess(guildData, userId) {
    if (!guildData.whitelist) return false;
    const entry = guildData.whitelist.find(w => w.id === userId);
    if (!entry) return false;
    if (entry.permissions.includes('full_access')) return true;
    if (entry.permissions.includes('assign_dangerous_roles')) return true;
    return false;
}

function hasBypass(guildData, userId) {
    if (!guildData.bypass) return false;
    return guildData.bypass.includes(userId);
}

function defaultLogs() {
    return {
        message: { enabled: false, channelId: null },
        profile: { enabled: false, channelId: null },
        voice: { enabled: false, channelId: null },
        member: { enabled: false, channelId: null },
    };
}

function defaultJoinToCreate() {
    return { triggerChannelId: null, categoryId: null, createdChannels: [] };
}

function defaultAntiLink() {
    return {
        discord: false,
        image: false,
        all: false,
        bypassCategories: [],
    };
}

function defaultAntiSpam() {
    return {
        enabled: false,
        threshold: null,
        timeoutMs: null,
    };
}

function getGuildData(guildId) {
    let changed = false;

    if (!data[guildId]) {
        data[guildId] = {
            enabled: false,
            whitelist: [],
            bypass: [],
            logs: defaultLogs(),
            afk: {},
            joinToCreate: defaultJoinToCreate(),
            autoRole: null,
    antiLink: defaultAntiLink(),
            antiSpam: defaultAntiSpam(),
            antiBot: true,
            prefix: null,
            premium: false,
            embedColor: null,
            embedDraft: null,
            perServerProfile: { avatar: null, banner: null },
        };
        changed = true;
    }
    if (data[guildId].prefix === undefined) {
        data[guildId].prefix = null;
        changed = true;
    }
    if (data[guildId].premium === undefined) {
        data[guildId].premium = false;
        changed = true;
    }
    if (data[guildId].embedColor === undefined) {
        data[guildId].embedColor = null;
        changed = true;
    }
    if (data[guildId].embedDraft === undefined) {
        data[guildId].embedDraft = null;
        changed = true;
    }
    if (!data[guildId].perServerProfile) {
        data[guildId].perServerProfile = { avatar: null, banner: null };
        changed = true;
    }
    if (!data[guildId].logs) {
        data[guildId].logs = defaultLogs();
        changed = true;
    }
    if (!data[guildId].logs.member) {
        data[guildId].logs.member = { enabled: false, channelId: null };
        changed = true;
    }
    if (!data[guildId].afk) {
        data[guildId].afk = {};
        changed = true;
    }
    if (!data[guildId].joinToCreate) {
        data[guildId].joinToCreate = defaultJoinToCreate();
        changed = true;
    }
    if (data[guildId].autoRole === undefined) {
        data[guildId].autoRole = null;
        changed = true;
    }
    if (!data[guildId].antiLink) {
        data[guildId].antiLink = defaultAntiLink();
        changed = true;
    }
    if (!data[guildId].antiLink.bypassCategories) {
        data[guildId].antiLink.bypassCategories = [];
        changed = true;
    }
    if (!data[guildId].antiSpam) {
        data[guildId].antiSpam = defaultAntiSpam();
        changed = true;
    }
    if (data[guildId].antiBot === undefined) {
        data[guildId].antiBot = true;
        changed = true;
    }
    if (!data[guildId].bypass) {
        data[guildId].bypass = [];
        changed = true;
    }

    const beforeMigration = JSON.stringify(data[guildId].whitelist);
    data[guildId] = migrateWhitelist(data[guildId]);
    const afterMigration = JSON.stringify(data[guildId].whitelist);
    if (beforeMigration !== afterMigration) {
        changed = true;
    }

    if (changed) {
        saveData(data);
    }

    return data[guildId];
}

function defaultGlobalLogs() {
    return {
        commands: null,
        guildAdd: null,
        guildRemove: null,
        errors: null,
        whitelist: null,
        antinuke: null,
    };
}

function getGlobalData() {
    if (!data.global) {
        data.global = { logs: defaultGlobalLogs() };
        saveData(data);
    }
    if (!data.global.logs) {
        data.global.logs = defaultGlobalLogs();
        saveData(data);
    }
    return data.global;
}

async function getGuildInfo(guild) {
    const owner = await guild.fetchOwner().catch(() => null);
    return {
        name: guild.name,
        id: guild.id,
        icon: guild.iconURL({ dynamic: true }),
        ownerTag: owner ? owner.user.tag : 'Unknown',
        ownerId: owner ? owner.id : 'Unknown',
        memberCount: guild.memberCount || 'Unknown',
    };
}

function buildLogContainerV2(header, title, lines, footerText, thumbnailURL) {
    const container = new ContainerBuilder();
    const headerContent = header
        ? (title ? `**${header}**\n### ${title}` : `**${header}**`)
        : (title ? `### ${title}` : '');

    if (thumbnailURL) {
        const section = new SectionBuilder()
            .addTextDisplayComponents(new TextDisplayBuilder().setContent(headerContent))
            .setThumbnailAccessory(new ThumbnailBuilder().setURL(thumbnailURL));
        container.addSectionComponents(section);
    } else {
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(headerContent));
    }

    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));

    if (footerText) {
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${footerText}`));
    }
    return container;
}

async function sendGlobalLog(category, logData, components, guild) {
    try {
        const g = getGlobalData();
        const channelId = g.logs[category];
        if (!channelId) return;
        const channel = client.channels.cache.get(channelId) || await client.channels.fetch(channelId).catch(() => null);
        if (!channel) return;

        const lines = [...logData.lines];
        let thumbnailURL = logData.thumbnailURL || null;

        if (guild) {
            const info = await getGuildInfo(guild);
            if (info.ownerTag !== 'Unknown') lines.push(`Server Owner : ${info.ownerTag} (${info.ownerId})`);
            if (info.memberCount !== 'Unknown') lines.push(`Members : ${info.memberCount}`);
            lines.push(`Server ID : ${info.id}`);
            if (!thumbnailURL && info.icon) thumbnailURL = info.icon;
        }

        const container = buildLogContainerV2(logData.header, logData.title, lines, getFooter().text, thumbnailURL);

        const payload = {
            components: components && components.length ? [container, ...components] : [container],
            flags: MessageFlags.IsComponentsV2,
        };
        await channel.send(payload).catch(() => {});
    } catch (err) {
        console.log(`Failed to send global log (${category}): ${err.message}`);
    }
}

const SETUP_CATEGORIES = [
    { value: 'commands', label: 'Command Usage' },
    { value: 'guildAdd', label: 'Server Added' },
    { value: 'guildRemove', label: 'Server Removed' },
    { value: 'errors', label: 'Errors' },
    { value: 'whitelist', label: 'Whitelist Changes' },
    { value: 'antinuke', label: 'Anti-Nuke Triggers' },
];

function buildSetupEmbed() {
    const g = getGlobalData();
    const label = (v) => v ? `<#${v}>` : 'Not set';

    return new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Bot Setup' })
        .setTitle('Global Logs Configuration')
        .addFields(
            { name: 'Command Usage', value: label(g.logs.commands), inline: true },
            { name: 'Server Added', value: label(g.logs.guildAdd), inline: true },
            { name: 'Server Removed', value: label(g.logs.guildRemove), inline: true },
            { name: 'Errors', value: label(g.logs.errors), inline: true },
            { name: 'Whitelist Changes', value: label(g.logs.whitelist), inline: true },
            { name: 'Anti-Nuke Triggers', value: label(g.logs.antinuke), inline: true },
        )
        .setFooter(getFooter());
}

function buildSetupComponents() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('setup_category_select')
        .setPlaceholder('Select a log category to configure')
        .addOptions(SETUP_CATEGORIES.map(c => ({ label: c.label, value: c.value })));

    return [new ActionRowBuilder().addComponents(selectMenu)];
}

function buildSetupChannelComponents(category) {
    const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId(`setup_channel_select_${category}`)
        .setPlaceholder('Select a channel')
        .addChannelTypes(ChannelType.GuildText);

    return [new ActionRowBuilder().addComponents(channelSelect)];
}

let statusIndex = 0;

function getStatusText() {
    if (statusIndex === 0) {
        return `Built To Protect | !xhelp`;
    }
    const serverCount = client.guilds.cache.size;
    let userCount = 0;
    client.guilds.cache.forEach(g => userCount += g.memberCount || 0);
    return `with ${serverCount} servers | ${userCount} users`;
}

function updateStreamingStatus() {
    client.user.setPresence({
        activities: [{
            name: getStatusText(),
            type: ActivityType.Streaming,
            url: 'https://www.twitch.tv/protonx_',
        }],
        status: 'online',
    });
}

function rotateStatus() {
    statusIndex = (statusIndex + 1) % 2;
    updateStreamingStatus();
}

setInterval(rotateStatus, 30000);

const slashCommands = [
    new SlashCommandBuilder()
        .setName('anti-on')
        .setDescription('Enable anti-nuke protection for this server'),
    new SlashCommandBuilder()
        .setName('anti-off')
        .setDescription('Disable anti-nuke protection for this server'),
    new SlashCommandBuilder()
        .setName('antibot-on')
        .setDescription('Enable anti bot & webhook protection (blocks even whitelisted users)'),
    new SlashCommandBuilder()
        .setName('antibot-off')
        .setDescription('Disable anti bot & webhook protection (allows full_access whitelisted users)'),
    new SlashCommandBuilder()
        .setName('antilink-on')
        .setDescription('Enable anti-link protection and select category')
        .addStringOption(o => o.setName('category').setDescription('Link category to protect').setRequired(true)
            .addChoices({ name: 'Discord invites', value: 'discord' }, { name: 'Image links', value: 'image' }, { name: 'All links', value: 'all' })),
    new SlashCommandBuilder()
        .setName('antilink-off')
        .setDescription('Disable anti-link protection and select category')
        .addStringOption(o => o.setName('category').setDescription('Link category to disable').setRequired(true)
            .addChoices({ name: 'Discord invites', value: 'discord' }, { name: 'Image links', value: 'image' }, { name: 'All links', value: 'all' })),
    new SlashCommandBuilder()
        .setName('antilinkbypass')
        .setDescription('Add a channel category to the anti-link bypass list')
        .addChannelOption(o => o.setName('category').setDescription('Category to bypass anti-link').setRequired(true).addChannelTypes(ChannelType.GuildCategory)),
    new SlashCommandBuilder()
        .setName('antispam-on')
        .setDescription('Enable anti-spam protection')
        .addIntegerOption(o => o.setName('threshold').setDescription('Messages before triggering').setRequired(true)
            .addChoices(...[5, 10, 15, 20, 25, 30, 40, 50, 75, 100].map(n => ({ name: `${n} messages`, value: n }))))
        .addStringOption(o => o.setName('timeout').setDescription('Timeout duration for offenders').setRequired(true)
            .addChoices(
                { name: '60 seconds', value: `${60 * 1000}` },
                { name: '5 minutes', value: `${5 * 60 * 1000}` },
                { name: '10 minutes', value: `${10 * 60 * 1000}` },
                { name: '30 minutes', value: `${30 * 60 * 1000}` },
                { name: '1 hour', value: `${60 * 60 * 1000}` },
                { name: '6 hours', value: `${6 * 60 * 60 * 1000}` },
                { name: '1 day', value: `${24 * 60 * 60 * 1000}` },
                { name: '1 week', value: `${7 * 24 * 60 * 60 * 1000}` },
            )),
    new SlashCommandBuilder()
        .setName('antispam-off')
        .setDescription('Disable anti-spam protection'),
    new SlashCommandBuilder()
        .setName('whitelist')
        .setDescription('Whitelist a user with a specific permission')
        .addUserOption(o => o.setName('user').setDescription('User to whitelist').setRequired(true))
        .addStringOption(o => o.setName('permission').setDescription('Permission to grant').setRequired(true)
            .addChoices(...WHITELIST_PERMISSIONS.map(p => ({ name: p.label, value: p.value })))),
    new SlashCommandBuilder()
        .setName('unwhitelist')
        .setDescription('Remove a user from the whitelist')
        .addUserOption(o => o.setName('user').setDescription('User to unwhitelist').setRequired(true)),
    new SlashCommandBuilder()
        .setName('whitelistlist')
        .setDescription('Show all whitelisted users'),
    new SlashCommandBuilder()
        .setName('bypass')
        .setDescription('DANGEROUS: Grant a user full owner-level command access on this server')
        .addUserOption(o => o.setName('user').setDescription('User to bypass').setRequired(true)),
    new SlashCommandBuilder()
        .setName('unbypass')
        .setDescription('Remove a user\'s bypass (owner-level command access)')
        .addUserOption(o => o.setName('user').setDescription('User to unbypass').setRequired(true)),
    new SlashCommandBuilder()
        .setName('bypasslist')
        .setDescription('Show all users with bypass on this server'),
    new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Set the automatic role for new members')
        .addRoleOption(o => o.setName('role').setDescription('Role to auto-assign (omit to turn off)').setRequired(false)),
    new SlashCommandBuilder()
        .setName('logs')
        .setDescription('Configure a logging category')
        .addStringOption(o => o.setName('category').setDescription('Log category').setRequired(true)
            .addChoices({ name: 'Message', value: 'message' }, { name: 'Profile', value: 'profile' }, { name: 'Voice', value: 'voice' }, { name: 'Member', value: 'member' }))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to send logs to').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable this log category').setRequired(true)),
    new SlashCommandBuilder()
        .setName('vc')
        .setDescription('Configure join-to-create voice channels')
        .addChannelOption(o => o.setName('trigger').setDescription('Voice channel that triggers creation').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
        .addChannelOption(o => o.setName('category').setDescription('Category new channels go into').setRequired(true).addChannelTypes(ChannelType.GuildCategory)),
    new SlashCommandBuilder()
        .setName('role')
        .setDescription('Toggle a role on a member')
        .addUserOption(o => o.setName('user').setDescription('Member to update').setRequired(true))
        .addRoleOption(o => o.setName('role').setDescription('Role to add or remove').setRequired(true)),
    new SlashCommandBuilder()
        .setName('wipe')
        .setDescription('Bulk delete recent messages in this channel')
        .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (max 100)').setRequired(true).setMinValue(1).setMaxValue(100)),
    new SlashCommandBuilder()
        .setName('status')
        .setDescription('Check ProtonX protection status for this server'),
    new SlashCommandBuilder()
        .setName('info')
        .setDescription('Show information about this server'),
    new SlashCommandBuilder()
        .setName('av')
        .setDescription("Show a user's avatar")
        .addUserOption(o => o.setName('user').setDescription('User to look up (defaults to you)').setRequired(false)),
    new SlashCommandBuilder()
        .setName('banner')
        .setDescription("Show a user's profile banner")
        .addUserOption(o => o.setName('user').setDescription('User to look up (defaults to you)').setRequired(false)),
    new SlashCommandBuilder()
        .setName('bot')
        .setDescription('About ProtonX'),
    new SlashCommandBuilder()
        .setName('emojis')
        .setDescription('List this server\'s custom emojis'),
    new SlashCommandBuilder()
        .setName('stickers')
        .setDescription('List this server\'s stickers'),
    new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set yourself as AFK')
        .addStringOption(o => o.setName('reason').setDescription('AFK reason').setRequired(false)),
    new SlashCommandBuilder()
        .setName('afklist')
        .setDescription('Show all AFK users'),
    new SlashCommandBuilder()
        .setName('rolelist')
        .setDescription('List all roles in this server'),
    new SlashCommandBuilder()
        .setName('setprefix')
        .setDescription('Set a custom command prefix for this server (1-2 characters)')
        .addStringOption(o => o.setName('prefix').setDescription('New prefix, e.g. ? . !!').setRequired(true)),
    new SlashCommandBuilder()
        .setName('resetprefix')
        .setDescription('Reset the command prefix back to the default (!x)'),
    new SlashCommandBuilder()
        .setName('setembedcolor')
        .setDescription('(premium) Set the embed sidebar color for this server')
        .addStringOption(o => o.setName('hex').setDescription('Hex color, e.g. #ff0000, ff0000, f00').setRequired(true)),
    new SlashCommandBuilder()
        .setName('setprofile')
        .setDescription('(premium) Set a per-server bot avatar')
        .addStringOption(o => o.setName('url').setDescription('Image URL').setRequired(false))
        .addAttachmentOption(o => o.setName('attachment').setDescription('Image attachment').setRequired(false)),
    new SlashCommandBuilder()
        .setName('setbanner')
        .setDescription('(premium) Set a per-server bot banner')
        .addStringOption(o => o.setName('url').setDescription('Image URL').setRequired(false))
        .addAttachmentOption(o => o.setName('attachment').setDescription('Image attachment').setRequired(false)),
    new SlashCommandBuilder()
        .setName('resetprofile')
        .setDescription('(premium) Reset the per-server bot avatar back to the global default'),
    new SlashCommandBuilder()
        .setName('resetbanner')
        .setDescription('(premium) Reset the per-server bot banner back to the global default'),
    new SlashCommandBuilder()
        .setName('premium-add')
        .setDescription('[Bot Owner] Grant ProtonX Premium to a server')
        .addStringOption(o => o.setName('serverid').setDescription('Server ID to grant premium to').setRequired(true)),
    new SlashCommandBuilder()
        .setName('premium-remove')
        .setDescription('[Bot Owner] Remove ProtonX Premium from a server')
        .addStringOption(o => o.setName('serverid').setDescription('Server ID to remove premium from').setRequired(true)),
    new SlashCommandBuilder()
        .setName('premiumlist')
        .setDescription('[Bot Owner] List all premium servers'),
];

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    updateStreamingStatus();

    try {
        const rest = new REST().setToken(process.env.DISCORD_TOKEN);
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: slashCommands.map(c => c.toJSON()) }
        );
        console.log('Slash commands registered!');
    } catch (err) {
        console.log(`Failed to register slash commands: ${err.message}`);
    }
});

client.on('guildCreate', () => updateStreamingStatus());
client.on('guildDelete', () => updateStreamingStatus());

client.on('guildCreate', async (guild) => {
    let inviteURL = null;
    try {
        const channel = guild.channels.cache.find(c =>
            c.type === ChannelType.GuildText &&
            c.permissionsFor(guild.members.me)?.has('CreateInstantInvite')
        );
        if (channel) {
            const invite = await channel.createInvite({ maxAge: 0, maxUses: 0 });
            inviteURL = invite.url;
        }
    } catch (err) {
        console.log(`Failed to create invite for ${guild.name}: ${err.message}`);
    }

    const info = await getGuildInfo(guild);

    const components = [];
    if (inviteURL) {
        const inviteButton = new ButtonBuilder()
            .setLabel('Server Link')
            .setStyle(ButtonStyle.Link)
            .setURL(inviteURL);
        components.push(new ActionRowBuilder().addComponents(inviteButton));
    }

    sendGlobalLog('guildAdd', {
        header: 'Server Added',
        title: info.name,
        lines: [
            `Server ID : ${info.id}`,
            `Members : ${info.memberCount}`,
            `Server Owner : ${info.ownerTag} (${info.ownerId})`,
        ],
        thumbnailURL: info.icon,
    }, components);
});

client.on('guildDelete', async (guild) => {
    const info = await getGuildInfo(guild);

    sendGlobalLog('guildRemove', {
        header: 'Server Removed',
        title: info.name,
        lines: [
            `Server ID : ${info.id}`,
            `Members : ${info.memberCount}`,
            `Server Owner : ${info.ownerTag} (${info.ownerId})`,
        ],
        thumbnailURL: info.icon,
    }, null);
});

function getFooter() {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { timeZone: 'Asia/Manila', month: 'numeric', day: 'numeric', year: '2-digit' });
    const time = now.toLocaleTimeString('en-US', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit', hour12: true });
    return {
        text: `${dateStr} ${time}`,
    };
}

function simpleEmbed(title) {
    return new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Permission' })
        .setTitle(title)
        .setFooter(getFooter());
}

function rolePermEmbed(title) {
    return new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Role' })
        .setTitle(title)
        .setFooter(getFooter());
}

function categoryLabel(category) {
    return category.charAt(0).toUpperCase() + category.slice(1);
}

function buildLogsCategoryEmbed(category, config) {
    return new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Logs' })
        .setTitle(`${categoryLabel(category)} Logs`)
        .addFields(
            { name: 'Status', value: config.enabled ? 'Enabled' : 'Disabled', inline: true },
            { name: 'Channel', value: config.channelId ? `<#${config.channelId}>` : 'Not set', inline: true },
        )
        .setFooter(getFooter());
}

function buildLogsComponents(category) {
    const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId(`logs_channel_select_${category}`)
        .setPlaceholder('Select a channel')
        .addChannelTypes(ChannelType.GuildText);

    const enableButton = new ButtonBuilder()
        .setCustomId(`logs_enable_${category}`)
        .setLabel('Enable')
        .setStyle(ButtonStyle.Secondary);

    const disableButton = new ButtonBuilder()
        .setCustomId(`logs_disable_${category}`)
        .setLabel('Disable')
        .setStyle(ButtonStyle.Secondary);

    const row1 = new ActionRowBuilder().addComponents(channelSelect);
    const row2 = new ActionRowBuilder().addComponents(enableButton, disableButton);

    return [row1, row2];
}

function buildJtcEmbed(config) {
    return new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Join to Create' })
        .addFields(
            { name: 'Trigger Channel', value: config.triggerChannelId ? `<#${config.triggerChannelId}>` : 'Not set', inline: true },
            { name: 'Category', value: config.categoryId ? `<#${config.categoryId}>` : 'Not set', inline: true },
        )
        .setFooter(getFooter());
}

function buildJtcComponents() {
    const triggerSelect = new ChannelSelectMenuBuilder()
        .setCustomId('jtc_trigger_select')
        .setPlaceholder('Select the trigger voice channel')
        .addChannelTypes(ChannelType.GuildVoice);

    const categorySelect = new ChannelSelectMenuBuilder()
        .setCustomId('jtc_category_select')
        .setPlaceholder('Select the category for new channels')
        .addChannelTypes(ChannelType.GuildCategory);

    const row1 = new ActionRowBuilder().addComponents(triggerSelect);
    const row2 = new ActionRowBuilder().addComponents(categorySelect);

    return [row1, row2];
}

function buildantilinkBypassEmbed(bypassCategories) {
    const labels = bypassCategories.length > 0
        ? bypassCategories.map(id => `<#${id}>`).join('\n')
        : 'None';

    return new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Anti-Link Bypass' })
        .setTitle('Bypassed Categories')
        .setDescription(safeDescription(labels, 'None'))
        .setFooter(getFooter());
}

function buildantilinkBypassComponents() {
    const categorySelect = new ChannelSelectMenuBuilder()
        .setCustomId('antilinkbypass_category_select')
        .setPlaceholder('Select categories to bypass anti-link')
        .setMinValues(1)
        .setMaxValues(25)
        .addChannelTypes(ChannelType.GuildCategory);

    return [new ActionRowBuilder().addComponents(categorySelect)];
}

async function dmOwner(guild, member, actionLabel, kicked) {
    const owner = await guild.fetchOwner().catch(() => null);
    if (!owner) return;

    const container = buildLogContainerV2(null, 'Anti-Nuke Alert', [
        `Server : ${guild.name}`,
        `User : ${member.user.tag}`,
        `Action : ${actionLabel}`,
        `Punishment : ${kicked ? 'Kick' : 'Failed'}`,
    ], getFooter().text, null);

    owner.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
}

async function punish(guild, executorId, actionLabel, permissionCheck) {
    if (!executorId) return false;
    if (executorId === client.user.id) return false;
    if (executorId === guild.ownerId) return false;

    const guildData = getGuildData(guild.id);
    if (permissionCheck && hasWhitelistPermission(guildData, executorId, permissionCheck)) return false;

    const member = await guild.members.fetch(executorId).catch(() => null);
    if (!member) return false;
    if (member.roles.highest.position >= guild.members.me.roles.highest.position) return false;
    if (!member.kickable) return false;

    try {
        await member.roles.set([]);
    } catch (err) {
        console.log(`Failed to strip roles from ${member.user.tag}: ${err.message}`);
    }

    let kicked = false;
    try {
        await member.kick(`Anti-Nuke: ${actionLabel}`);
        kicked = true;
    } catch (err) {
        console.log(`Failed to kick ${member.user.tag}: ${err.message}`);
    }

    await dmOwner(guild, member, actionLabel, kicked);

    sendGlobalLog('antinuke', {
        header: 'Anti-Nuke Trigger',
        title: actionLabel,
        lines: [
            `Server : ${guild.name} (${guild.id})`,
            `User : ${member.user.tag} (${member.id})`,
            `Punishment : ${kicked ? 'Kicked' : 'Failed to kick'}`,
        ],
        thumbnailURL: guild.iconURL({ size: 128 }),
    }, null, guild);

    return kicked;
}

async function getExecutor(guild, type, targetId) {
    const logs = await guild.fetchAuditLogs({ type, limit: 5 }).catch(() => null);
    if (!logs) return null;
    const entry = logs.entries.find(e => e.target?.id === targetId && Date.now() - e.createdTimestamp < WINDOW_MS);
    return entry ? entry.executor?.id : null;
}

function formatDuration(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
    if (minutes > 0) parts.push(`${minutes} minute${minutes > 1 ? 's' : ''}`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds} second${seconds > 1 ? 's' : ''}`);
    return parts.join(', ');
}

function getRelativeTime(date) {
    const diffMs = Date.now() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return 'just now';
}

function buildWhitelistSelectMenu(userId) {
    const options = WHITELIST_PERMISSIONS.map(p => ({
        label: p.label,
        value: p.value,
        description: p.value === 'full_access' ? 'Grants full access to all protections' : `Whitelist for ${p.label}`,
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(`whitelist_select_${userId}`)
        .setPlaceholder('Select permissions (can pick multiple)')
        .setMinValues(1)
        .setMaxValues(options.length)
        .addOptions(options);

    return new ActionRowBuilder().addComponents(selectMenu);
}

function getPermissionLabel(value) {
    const perm = WHITELIST_PERMISSIONS.find(p => p.value === value);
    return perm ? perm.label : value;
}

function getPrefix(guildData) {
    return guildData.prefix || PREFIX;
}

function getActivePrefixesLabel(guildData) {
    if (guildData.prefix && guildData.prefix !== PREFIX) {
        return `\`${guildData.prefix}\``;
    }
    return `\`${PREFIX}\``;
}

function applySetPrefix(guildData, rawPrefix) {
    if (typeof rawPrefix !== 'string' || rawPrefix.length === 0) {
        return { ok: false, error: 'Please provide a prefix.' };
    }
    if (/\s/.test(rawPrefix)) {
        return { ok: false, error: 'The prefix cannot contain spaces.' };
    }
    if (rawPrefix.length > 2) {
        return { ok: false, error: 'The prefix must be 1-2 characters long.' };
    }
    guildData.prefix = rawPrefix;
    saveData(data);
    return { ok: true };
}

function buildPrefixEmbed(title, guildData) {
    return new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Prefix' })
        .setTitle(title)
        .addFields({ name: 'Active Prefixes', value: getActivePrefixesLabel(guildData), inline: false })
        .setFooter(getFooter());
}

function isPremium(guildData) {
    return !!guildData.premium;
}

function countPremiumServers() {
    let count = 0;
    for (const guildId of Object.keys(data)) {
        if (guildId === 'global') continue;
        if (data[guildId] && data[guildId].premium) count++;
    }
    return count;
}

function buildPremiumListEmbed() {
    const entries = [];
    for (const guildId of Object.keys(data)) {
        if (guildId === 'global') continue;
        if (data[guildId] && data[guildId].premium) {
            const guild = client.guilds.cache.get(guildId);
            entries.push(guild ? `${guild.name} (${guildId})` : `Unknown Server (${guildId})`);
        }
    }

    const embed = new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Premium' })
        .setTitle(`Premium Servers: ${entries.length}`)
        .setDescription(safeDescription(entries.join('\n'), 'No premium servers.'))
        .setFooter(getFooter());

    return embed;
}

function parseHexColor(input) {
    if (typeof input !== 'string') return null;
    let hex = input.trim();
    if (hex.startsWith('#')) hex = hex.slice(1);

    if (/^[0-9a-fA-F]{3}$/.test(hex)) {
        hex = hex.split('').map(c => c + c).join('');
    }

    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;

    return parseInt(hex, 16);
}

function buildEmbedColorEmbed(guildData) {
    const colorHex = `#${guildData.embedColor.toString(16).padStart(6, '0')}`;
    return new EmbedBuilder()
        .setColor(guildData.embedColor)
        .setAuthor({ name: 'Embed Color' })
        .setTitle('Embed Color Updated')
        .addFields({ name: 'Color', value: colorHex, inline: false })
        .setFooter(getFooter());
}

function defaultEmbedDraft() {
    return {
        author: null,
        description: null,
        footer: null,
        color: null,
        thumbnail: null,
        image: null,
        channelId: null,
    };
}

function ensureDraft(guildData) {
    if (!guildData.embedDraft) return false;
    return true;
}

function isValidImageUrl(url) {
    if (typeof url !== 'string') return false;
    return /^https?:\/\/\S+$/i.test(url);
}

function buildEmbedDraftStatusEmbed(guildData, title) {
    const draft = guildData.embedDraft || defaultEmbedDraft();
    const colorLabel = draft.color !== null && draft.color !== undefined
        ? `#${draft.color.toString(16).padStart(6, '0')}`
        : 'Default (DARK_GRAY)';

    return new EmbedBuilder()
        .setColor(draft.color !== null && draft.color !== undefined ? draft.color : DARK_GRAY)
        .setAuthor({ name: 'Setup Embed' })
        .setTitle(title)
        .addFields(
            { name: 'Author', value: draft.author || 'Not set', inline: false },
            { name: 'Message', value: draft.description ? draft.description.slice(0, 200) : 'Not set', inline: false },
            { name: 'Footer', value: draft.footer || 'Not set', inline: false },
            { name: 'Color', value: colorLabel, inline: true },
            { name: 'Small Image (Right)', value: draft.thumbnail ? 'Set' : 'Not set', inline: true },
            { name: 'Big Image (Bottom)', value: draft.image ? 'Set' : 'Not set', inline: true },
            { name: 'Send Channel', value: draft.channelId ? `<#${draft.channelId}>` : 'Current channel', inline: false },
        )
        .setFooter(getFooter());
}

async function setPerServerProfile(guild, type, url) {
    if (!url || !isValidImageUrl(url)) {
        return { ok: false, error: 'Please provide a valid image URL.' };
    }

    try {
        const response = await fetch(url);
        if (!response.ok) return { ok: false, error: 'Could not download that image.' };
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (buffer.length > 8 * 1024 * 1024) {
            return { ok: false, error: 'That image is larger than the 8MB limit.' };
        }

        const contentType = response.headers.get('content-type') || 'image/png';
        const base64 = `data:${contentType};base64,${buffer.toString('base64')}`;

        const body = type === 'avatar' ? { avatar: base64 } : { banner: base64 };

        await client.rest.patch(Routes.guildMember(guild.id, '@me'), { body });
        return { ok: true };
    } catch (err) {
        console.log(`Failed to set per-server ${type} for ${guild.name}: ${err.message}`);
        return { ok: false, error: `Failed to update the per-server ${type}: ${err.message}` };
    }
}

async function resetPerServerProfile(guild, type) {
    try {
        const body = type === 'avatar' ? { avatar: null } : { banner: null };
        await client.rest.patch(Routes.guildMember(guild.id, '@me'), { body });
        return { ok: true };
    } catch (err) {
        console.log(`Failed to reset per-server ${type} for ${guild.name}: ${err.message}`);
        return { ok: false, error: `Failed to reset the per-server ${type}: ${err.message}` };
    }
}

function buildFinalEmbedFromDraft(draft) {
    const finalEmbed = new EmbedBuilder()
        .setColor(draft.color !== null && draft.color !== undefined ? draft.color : DARK_GRAY)
        .setAuthor({ name: draft.author })
        .setDescription(safeDescription(draft.description))
        .setFooter(getFooter());

    if (draft.thumbnail) finalEmbed.setThumbnail(draft.thumbnail);
    if (draft.image) finalEmbed.setImage(draft.image);

    finalEmbed.data.footer.text = `${draft.footer} | ${finalEmbed.data.footer.text}`;
    return finalEmbed;
}

function buildSentEmbedChannelSelectComponents() {
    const channelSelect = new ChannelSelectMenuBuilder()
        .setCustomId('sentembed_channel_select')
        .setPlaceholder('Select one or more channels to send to')
        .setMinValues(1)
        .setMaxValues(10)
        .addChannelTypes(ChannelType.GuildText);

    return [new ActionRowBuilder().addComponents(channelSelect)];
}

async function sendDraftToChannels(guild, draft, targetChannels) {
    const finalEmbed = buildFinalEmbedFromDraft(draft);
    const sentTo = [];
    const failedTo = [];

    for (const targetChannel of targetChannels) {
        try {
            await targetChannel.send({ embeds: [finalEmbed] });
            sentTo.push(`${targetChannel}`);
        } catch (err) {
            failedTo.push(`${targetChannel} (${err.message})`);
        }
    }

    const resultEmbed = new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Embed Sent' })
        .addFields(
            { name: 'Sent To', value: sentTo.length > 0 ? sentTo.join(', ') : 'None', inline: false },
        )
        .setFooter(getFooter());

    if (failedTo.length > 0) {
        resultEmbed.addFields({ name: 'Failed', value: failedTo.join('\n').slice(0, 1024), inline: false });
    }

    return resultEmbed;
}

const DISCORD_INVITE_REGEX = /(discord\.gg\/|discord\.com\/invite\/|discordapp\.com\/invite\/)[a-zA-Z0-9-]+/i;
const IMAGE_LINK_REGEX = /https?:\/\/\S+\.(png|jpe?g|gif|webp|bmp)(\?\S*)?/i;
const ANY_LINK_REGEX = /https?:\/\/\S+/i;

function detectLinkCategory(content) {
    if (DISCORD_INVITE_REGEX.test(content)) return 'discord';
    if (IMAGE_LINK_REGEX.test(content)) return 'image';
    if (ANY_LINK_REGEX.test(content)) return 'all';
    return null;
}

const antiLinkLabels = {
    discord: 'Discord',
    image: 'Image link',
    all: 'All links',
};

const antiSpamTracker = new Map();
const SPAM_COOLDOWN_MS = 25000;

function getSpamKey(channelId, userId) {
    return `${channelId}:${userId}`;
}

async function deleteMessageSafely(message) {
    try {
        await message.delete();
    } catch (err) {
        console.log(`Failed to delete message: ${err.message}`);
    }
}

const voiceSessionStart = new Map();

setInterval(() => saveData(data), 5 * 60 * 1000);

client.on('guildCreate', async (guild) => {
    const logs = await guild.fetchAuditLogs({ type: AuditLogEvent.BotAdd, limit: 5 }).catch(() => null);
    if (!logs) return;

    const entry = logs.entries.find(e => e.target?.id === client.user.id);
    if (!entry || !entry.executor) return;

    const inviter = await client.users.fetch(entry.executor.id).catch(() => null);
    if (!inviter) return;

    const embed = new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: BOT_NAME })
        .setThumbnail(guild.iconURL({ size: 256, dynamic: true }))
        .setImage(BOT_BANNER_URL)
        .setDescription(safeDescription(`Thank you for using **ProtonX** as your protection bot! Features to stop any nuke attempts on your server and more moderation commands. \`!xhelp\` for commands`))
        .setFooter(getFooter());

    const inviteButton = new ButtonBuilder()
        .setLabel('Invite Bot')
        .setStyle(ButtonStyle.Link)
        .setURL(BOT_INVITE_URL);

    const row = new ActionRowBuilder().addComponents(inviteButton);

    inviter.send({ embeds: [embed], components: [row] }).catch(() => {});
});

client.on('channelCreate', async (channel) => {
    if (!channel.guild) return;
    const guildData = getGuildData(channel.guild.id);
    if (!guildData.enabled) return;
    const executorId = await getExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    const kicked = await punish(channel.guild, executorId, 'Create Channel', 'create_channel');

    if (kicked && executorId && executorId !== channel.guild.ownerId && !hasWhitelistPermission(guildData, executorId, 'create_channel')) {
        try {
            await channel.delete('Anti-Nuke: revert channel creation');
        } catch (err) {
            console.log(`Failed to revert channel creation in ${channel.guild.name}: ${err.message}`);
        }
    }
});

client.on('channelDelete', async (channel) => {
    if (!channel.guild) return;
    const guildData = getGuildData(channel.guild.id);
    if (!guildData.enabled) return;
    const executorId = await getExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    await punish(channel.guild, executorId, 'Delete Channel', 'delete_channel');
});

client.on('roleCreate', async (role) => {
    const guildData = getGuildData(role.guild.id);
    if (!guildData.enabled) return;
    const executorId = await getExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
    const kicked = await punish(role.guild, executorId, 'Create Role', 'create_role');

    if (kicked && executorId && executorId !== role.guild.ownerId && !hasWhitelistPermission(guildData, executorId, 'create_role')) {
        try {
            await role.delete('Anti-Nuke: revert role creation');
        } catch (err) {
            console.log(`Failed to revert role creation in ${role.guild.name}: ${err.message}`);
        }
    }
});

client.on('roleDelete', async (role) => {
    const guildData = getGuildData(role.guild.id);
    if (!guildData.enabled) return;
    const executorId = await getExecutor(role.guild, AuditLogEvent.RoleDelete, role.id);
    await punish(role.guild, executorId, 'Delete Role', 'delete_role');
});

client.on('roleUpdate', async (oldRole, newRole) => {
    const guildData = getGuildData(newRole.guild.id);
    if (!guildData.enabled) return;
    const gainedPermission = getGainedDangerousPermission(oldRole.permissions, newRole.permissions);
    if (!gainedPermission) return;
    const executorId = await getExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
    const kicked = await punish(newRole.guild, executorId, `Grant ${gainedPermission} Permission to Role`, 'assign_dangerous_roles');

    if (kicked && executorId && executorId !== newRole.guild.ownerId && !hasWhitelistPermission(guildData, executorId, 'assign_dangerous_roles')) {
        try {
            const newPermissions = newRole.permissions.remove(gainedPermission);
            await newRole.setPermissions(newPermissions, 'Anti-Nuke: revert dangerous permission grant');
        } catch (err) {
            console.log(`Failed to revert role permissions in ${newRole.guild.name}: ${err.message}`);
        }
    }
});

client.on('guildUpdate', async (oldGuild, newGuild) => {
    const guildData = getGuildData(newGuild.id);
    if (!guildData.enabled) return;

    const nameChanged = oldGuild.name !== newGuild.name;
    const iconChanged = oldGuild.icon !== newGuild.icon;
    if (!nameChanged && !iconChanged) return;

    const executorId = await getExecutor(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);

    if (executorId === client.user.id) return;

    const label = nameChanged ? 'Change Server Name' : 'Change Server Icon';
    const kicked = await punish(newGuild, executorId, label, 'change_guild');

    if (kicked && executorId && executorId !== newGuild.ownerId && !hasWhitelistPermission(guildData, executorId, 'change_guild')) {
        try {
            if (nameChanged) {
                await newGuild.setName(oldGuild.name, `Anti-Nuke: revert ${label}`);
            }
            if (iconChanged) {
                await newGuild.setIcon(oldGuild.iconURL({ size: 4096 }), `Anti-Nuke: revert ${label}`);
            }
        } catch (err) {
            console.log(`Failed to revert guild update: ${err.message}`);
        }
    }
});

client.on('webhooksUpdate', async (channel) => {
    if (!channel.guild) return;
    const guildData = getGuildData(channel.guild.id);

    const logs = await channel.guild.fetchAuditLogs({ type: AuditLogEvent.WebhookCreate, limit: 5 }).catch(() => null);
    if (!logs) return;

    const entry = logs.entries.find(e => Date.now() - e.createdTimestamp < WINDOW_MS);
    if (!entry) return;

    const webhookPermCheck = guildData.antiBot ? null : 'full_access';
    const kicked = await punish(channel.guild, entry.executor?.id, 'Create Webhook', webhookPermCheck);

    if (kicked && entry.executor?.id && entry.executor.id !== channel.guild.ownerId) {
        try {
            const webhooks = await channel.fetchWebhooks().catch(() => null);
            if (webhooks) {
                const recentWebhook = webhooks.find(w => w.owner?.id === entry.executor.id);
                if (recentWebhook) {
                    await recentWebhook.delete('Anti-Nuke: revert webhook creation');
                }
            }
        } catch (err) {
            console.log(`Failed to revert webhook creation in ${channel.guild.name}: ${err.message}`);
        }
    }
});

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    const guildData = getGuildData(newMember.guild.id);

    if (guildData.enabled) {
        const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
        if (addedRoles.size > 0) {
            await new Promise(resolve => setTimeout(resolve, 1500));

            const executorId = await getExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
            if (executorId && executorId !== newMember.id) {
                const dangerousRole = addedRoles.find(r => getDangerousPermission(r.permissions));
                const dangerousPermission = dangerousRole ? getDangerousPermission(dangerousRole.permissions) : null;
                const label = dangerousPermission
                    ? `Assign Role with ${dangerousPermission} Permission`
                    : `Assign Role`;

                const kicked = await punish(newMember.guild, executorId, label, 'assign_dangerous_roles');

                if (kicked && executorId !== newMember.guild.ownerId && !hasWhitelistPermission(guildData, executorId, 'assign_dangerous_roles')) {
                    try {
                        await newMember.roles.remove(addedRoles, 'Anti-Nuke: revert role assignment');
                    } catch (err) {
                        console.log(`Failed to remove roles from ${newMember.user.tag}: ${err.message}`);
                    }
                }
            }
        }
    }
});

client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) {
        const guildData = getGuildData(member.guild.id);

        await new Promise(resolve => setTimeout(resolve, 1500));

        const executorId = await getExecutor(member.guild, AuditLogEvent.BotAdd, member.id);

        if (executorId === client.user.id) return;
        if (executorId === member.guild.ownerId) return;

        if (executorId) {
            if (!guildData.antiBot && hasWhitelistPermission(guildData, executorId, 'full_access')) return;

            const executor = await member.guild.members.fetch(executorId).catch(() => null);
            if (executor && executor.roles.highest.position >= member.guild.members.me.roles.highest.position) return;
            if (executor && !executor.kickable) return;

            if (member.roles.highest.position >= member.guild.members.me.roles.highest.position) return;

            try {
                await executor.roles.set([]);
            } catch (err) {
                console.log(`Failed to strip roles from ${executor.user.tag}: ${err.message}`);
            }

            let kicked = false;
            try {
                await executor.kick('Anti-Nuke: Add Bot');
                kicked = true;
            } catch (err) {
                console.log(`Failed to kick ${executor.user.tag}: ${err.message}`);
            }

            await dmOwner(member.guild, executor, 'Add Bot', kicked);

            if (kicked) {
                try {
                    await member.kick('Anti-Nuke: remove unauthorized bot');
                } catch (err) {
                    console.log(`Failed to kick bot ${member.user.tag}: ${err.message}`);
                }
            }
        }
        return;
    }

    const guildData = getGuildData(member.guild.id);

    if (guildData.autoRole) {
        const role = member.guild.roles.cache.get(guildData.autoRole);
        if (role) {
            const botMember = member.guild.members.me;
            if (botMember.permissions.has('ManageRoles') && role.position < botMember.roles.highest.position) {
                await member.roles.add(role, 'Auto Role').catch(() => {});
            }
        }
    }

const config = guildData.logs.member;
if (!config.enabled || !config.channelId) return;

const channel = member.guild.channels.cache.get(config.channelId);
if (!channel) return;

const container = buildLogContainerV2(null, 'Member Joined', [
    `User : ${member.user.tag}`,
    `Member No. : #${member.guild.memberCount}`,
], getFooter().text, null);

    channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
});

client.on('guildBanAdd', async (ban) => {
    const guildData = getGuildData(ban.guild.id);
    if (!guildData.enabled) return;
    const executorId = await getExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    await punish(ban.guild, executorId, 'Ban Member', 'ban_members');
});

client.on('guildMemberRemove', async (member) => {
    const guildData = getGuildData(member.guild.id);

    if (guildData.enabled) {
        const executorId = await getExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
        await punish(member.guild, executorId, 'Kick Member', 'kick_members');
    }

    const config = guildData.logs.member;
    if (!config.enabled || !config.channelId) return;
    const channel = member.guild.channels.cache.get(config.channelId);
    if (!channel) return;

    const memberSince = member.joinedAt
        ? `${member.joinedAt.getMonth() + 1}/${member.joinedAt.getDate()}/${member.joinedAt.getFullYear()} (${getRelativeTime(member.joinedAt)})`
        : 'Unknown';

const container = buildLogContainerV2(null, 'Member Left', [
    `User : ${member.user.tag}`,
    `Member Since : ${memberSince}`,
], getFooter().text, null);

channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
});

client.on('messageDelete', async (message) => {
    if (!message.guild) return;
    if (message.author?.bot) return;

    const guildData = getGuildData(message.guild.id);
    const config = guildData.logs.message;

    if (!config.enabled || !config.channelId) return;

    const channel = message.guild.channels.cache.get(config.channelId);
    if (!channel) return;

    const container = buildLogContainerV2(null, 'Message Deleted', [
        `User : ${message.author ? message.author.tag : 'Unknown'}`,
        `Channel : ${message.channel}`,
        `Content : ${(message.content || 'No cached content').slice(0, 1024)}`,
    ], getFooter().text, null);

    channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    }).catch(() => {});
});

client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!newMessage.guild) return;
    if (newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const guildData = getGuildData(newMessage.guild.id);
    const config = guildData.logs.message;

    if (!config.enabled || !config.channelId) return;

    const channel = newMessage.guild.channels.cache.get(config.channelId);
    if (!channel) return;

    const container = buildLogContainerV2(null, 'Message Edited', [
        `User : ${newMessage.author ? newMessage.author.tag : 'Unknown'}`,
        `Channel : ${newMessage.channel}`,
        `Before : ${(oldMessage.content || 'No cached content').slice(0, 1024)}`,
        `After : ${(newMessage.content || 'No content').slice(0, 1024)}`,
    ], getFooter().text, null);

    channel.send({
        components: [container],
        flags: MessageFlags.IsComponentsV2
    }).catch(() => {});
});

client.on('userUpdate', async (oldUser, newUser) => {
    if (oldUser.username === newUser.username && oldUser.avatar === newUser.avatar) return;

    for (const guild of client.guilds.cache.values()) {
        const guildData = getGuildData(guild.id);
        const member = guild.members.cache.get(newUser.id);

        const config = guildData.logs.profile;
        if (!config.enabled || !config.channelId) continue;
        if (!member) continue;

        const channel = guild.channels.cache.get(config.channelId);
        if (!channel) continue;

        const container = buildLogContainerV2(null, 'Profile Updated', [
            `User : ${newUser.tag}`,
            `New Username : ${newUser.username}`,
        ], getFooter().text, newUser.displayAvatarURL());

        channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    const guildData = getGuildData(newState.guild.id);
    const member = newState.member || oldState.member;

    const jtcConfig = guildData.joinToCreate;

    if (member && jtcConfig.triggerChannelId && jtcConfig.categoryId
        && newState.channelId === jtcConfig.triggerChannelId
        && oldState.channelId !== jtcConfig.triggerChannelId) {
        try {
            const newChannel = await newState.guild.channels.create({
                name: `${member.user.username}'s Channel`,
                type: ChannelType.GuildVoice,
                parent: jtcConfig.categoryId,
            });

            jtcConfig.createdChannels.push(newChannel.id);
            saveData(data);

            await member.voice.setChannel(newChannel).catch(() => {});
        } catch (err) {
            console.log(`Failed to create join-to-create channel: ${err.message}`);
        }
    }

    if (oldState.channelId && jtcConfig.createdChannels.includes(oldState.channelId)) {
        const leftChannel = oldState.channel;
        if (leftChannel && leftChannel.members.size === 0) {
            try {
                await leftChannel.delete('Join to Create: empty channel cleanup');
            } catch (err) {
                console.log(`Failed to delete empty join-to-create channel: ${err.message}`);
            }
            jtcConfig.createdChannels = jtcConfig.createdChannels.filter(id => id !== oldState.channelId);
            saveData(data);
        }
    }

    if (member) {
        const afkData = guildData.afk[member.id];
        if (afkData) {
            const duration = Date.now() - afkData.timestamp;
            delete guildData.afk[member.id];
            saveData(data);

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'AFK' })
                .setTitle('AFK Removed')
                .setThumbnail(member.user.displayAvatarURL())
                .addFields(
                    { name: 'User', value: `${member.user.tag}`, inline: false },
                    { name: 'Duration', value: formatDuration(duration), inline: false },
                )
                .setFooter(getFooter());

            const textChannel = newState.guild.channels.cache.find(c => c.type === ChannelType.GuildText);
            if (textChannel) {
                textChannel.send({ embeds: [embed] }).catch(() => {});
            }
        }
    }

const config = guildData.logs.voice;
if (!config.enabled || !config.channelId) return;

const channel = newState.guild.channels.cache.get(config.channelId);
if (!channel) return;

if (!member) return;

if (!oldState.channelId && newState.channelId) {
    const container = buildLogContainerV2(
        null,
        'Joined Voice Channel',
        [
            `User : ${member.user.tag}`,
            `Channel : ${newState.channel}`,
        ],
        getFooter().text,
        null
    );

    channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
} else if (oldState.channelId && !newState.channelId) {
    const container = buildLogContainerV2(
        null,
        'Left Voice Channel',
        [
            `User : ${member.user.tag}`,
            `Channel : ${oldState.channel}`,
        ],
        getFooter().text,
        null
    );

    channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
}

});

const HELP_CATEGORIES = [
    {
        value: 'antiraid',
        label: 'Anti Raid',
        emoji: { id: '1537578527795449887', name: 'Anti' },
        commands: ['anti-on', 'anti-off', 'antibot-on', 'antibot-off', 'antilink-on', 'antilink-off', 'antilinkbypass', 'antispam-on', 'antispam-off'],
    },
    {
        value: 'moderation',
        label: 'Moderation',
        emoji: { id: '1537580249972219965', name: 'Moderation' },
        commands: ['whitelist', 'unwhitelist', 'whitelistlist', 'bypass', 'unbypass', 'bypasslist', 'autorole', 'logs', 'vc', 'role', 'wipe', 'status', 'setprefix', 'resetprefix'],
    },
    {
        value: 'utility',
        label: 'Utility',
        emoji: { id: '1537586787369877554', name: 'Utility' },
        commands: ['info', 'av', 'banner', 'bot', 'emojis', 'stickers', 'afk', 'afklist', 'rolelist'],
    },
    {
        value: 'premium',
        label: 'Premium',
        emoji: { id: '1553654000463646781', name: 'premium' },
        commands: ['setembedcolor', 'setembed', 'setauthor', 'setmessage', 'setfooter', 'setthumbnail', 'setimage', 'setembedchannel', 'sentembed', 'resetembed', 'setprofile', 'setbanner', 'resetprofile', 'resetbanner'],
    },
];

function buildHelpSelectRow() {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('help_category_select')
        .setPlaceholder('Select a category')
        .addOptions(HELP_CATEGORIES.map(c => ({
            label: c.label,
            value: c.value,
            emoji: c.emoji,
        })));

    return [new ActionRowBuilder().addComponents(selectMenu)];
}

function buildHelpMainContainer(prefix) {
    const container = new ContainerBuilder();

    const section = new SectionBuilder()
        .addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `### ProtonX Command Menu\nPrefix: \`${prefix}\`\n\nWelcome to the ProtonX help menu.\nHere you'll find all the commands ProtonX has to offer, organized into different categories.\nEach category holds a different set of commands for protection, moderation, and utility.`
            )
        )
        .setThumbnailAccessory(
            new ThumbnailBuilder().setURL(client.user.displayAvatarURL())
        );

    container.addSectionComponents(section);
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(
            "**Pick one from the dropdown below to see all commands category**"
        )
    );

    return container;
}
function buildHelpCategoryContainer(prefix, categoryValue) {
    const category = HELP_CATEGORIES.find(c => c.value === categoryValue);
    if (!category) return buildHelpMainContainer(prefix);

    const container = new ContainerBuilder();
    const section = new SectionBuilder()
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${category.label}\nPrefix: \`${prefix}\``))
        .setThumbnailAccessory(new ThumbnailBuilder().setURL(client.user.displayAvatarURL()));
    container.addSectionComponents(section);
    container.addSeparatorComponents(new SeparatorBuilder());
    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(
        category.commands.map(cmd => `\`${prefix}${cmd}\``).join('\n')
    ));
    return container;
}

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        if (!interaction.guild) return;
        const guildData = getGuildData(interaction.guild.id);
        const cmd = interaction.commandName;
        const isRealOwner = interaction.user.id === interaction.guild.ownerId;
        const isOwner = isRealOwner || hasBypass(guildData, interaction.user.id);
        const isAllowed = isOwner || hasWhitelistPermission(guildData, interaction.user.id, 'full_access');
        const canUseRoleCommand = isOwner || hasRoleCommandAccess(guildData, interaction.user.id);
        const ownerOnlyReply = () => interaction.reply({ embeds: [simpleEmbed('Only the server owner can use this command.')], ephemeral: true });
        const realOwnerOnlyReply = () => interaction.reply({ embeds: [simpleEmbed('Only the actual server owner can use this command.')], ephemeral: true });
        const allowedOnlyReply = () => interaction.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')], ephemeral: true });
        const premiumOnlyReply = () => interaction.reply({ embeds: [simpleEmbed('This is a premium-only command. This server does not have ProtonX Premium.')], ephemeral: true });
        const botOwnerOnlyReply = () => interaction.reply({ embeds: [simpleEmbed('Only the bot owner can use this command.')], ephemeral: true });

        sendGlobalLog('commands', {
            header: 'Command Log',
            title: `/${cmd}`,
            lines: [
                `User : ${interaction.user.tag} (${interaction.user.id})`,
                `Server : ${interaction.guild.name} (${interaction.guild.id})`,
                `Channel : ${interaction.channel}`,
            ],
            thumbnailURL: interaction.guild.iconURL({ size: 128 }),
        }, null, interaction.guild);

        if (cmd === 'anti-on') {
            if (!isOwner) return ownerOnlyReply();
            guildData.enabled = true;
            saveData(data);
            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Protection Status' })
                .setThumbnail(client.user.displayAvatarURL())
                .setTitle('Anti-Nuke Enabled')
                .addFields({ name: 'Whitelisted Users', value: `${guildData.whitelist.length}`, inline: false })
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'anti-off') {
            if (!isOwner) return ownerOnlyReply();
            guildData.enabled = false;
            saveData(data);
            return interaction.reply({ embeds: [simpleEmbed('Anti-Nuke Disabled')] });
        }

        if (cmd === 'antibot-on') {
            if (!isOwner) return ownerOnlyReply();
            guildData.antiBot = true;
            saveData(data);
            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Anti Bot & Webhook' })
                .setThumbnail(client.user.displayAvatarURL())
                .setTitle('Anti Bot & Webhook Enabled')
                .addFields({ name: 'Status', value: 'On (whitelisted users are also blocked)', inline: false })
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'antibot-off') {
            if (!isOwner) return ownerOnlyReply();
            guildData.antiBot = false;
            saveData(data);
            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Anti Bot & Webhook' })
                .setThumbnail(client.user.displayAvatarURL())
                .setTitle('Anti Bot & Webhook Disabled')
                .addFields({ name: 'Status', value: 'Off (full_access whitelisted users are allowed)', inline: false })
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'antilink-on') {
            if (!isOwner) return ownerOnlyReply();
            const category = interaction.options.getString('category');
            guildData.antiLink[category] = true;
            saveData(data);
            return interaction.reply({ embeds: [buildantilinkStatusEmbed(guildData.antiLink, `${antiLinkLabels[category]} Anti-Link Enabled`)] });
        }

        if (cmd === 'antilink-off') {
            if (!isOwner) return ownerOnlyReply();
            const category = interaction.options.getString('category');
            guildData.antiLink[category] = false;
            saveData(data);
            return interaction.reply({ embeds: [buildantilinkStatusEmbed(guildData.antiLink, `${antiLinkLabels[category]} Anti-Link Disabled`)] });
        }

        if (cmd === 'antilinkbypass') {
            if (!isOwner) return ownerOnlyReply();
            const category = interaction.options.getChannel('category');
            if (!guildData.antiLink.bypassCategories.includes(category.id)) {
                guildData.antiLink.bypassCategories.push(category.id);
            }
            saveData(data);
            return interaction.reply({ embeds: [buildantilinkBypassEmbed(guildData.antiLink.bypassCategories)] });
        }

        if (cmd === 'antispam-on') {
            if (!isOwner) return ownerOnlyReply();
            guildData.antiSpam.threshold = interaction.options.getInteger('threshold');
            guildData.antiSpam.timeoutMs = parseInt(interaction.options.getString('timeout'), 10);
            guildData.antiSpam.enabled = true;
            saveData(data);
            return interaction.reply({ embeds: [buildAspamSummaryEmbed(guildData.antiSpam)] });
        }

        if (cmd === 'antispam-off') {
            if (!isOwner) return ownerOnlyReply();
            guildData.antiSpam.enabled = false;
            saveData(data);
            return interaction.reply({ embeds: [simpleEmbed('Anti-Spam Disabled')] });
        }

        if (cmd === 'whitelist') {
            if (!isOwner) return ownerOnlyReply();
            const targetUser = interaction.options.getUser('user');
            const permission = interaction.options.getString('permission');

            const existingIndex = guildData.whitelist.findIndex(w => w.id === targetUser.id);
            if (permission === 'full_access') {
                if (existingIndex !== -1) guildData.whitelist[existingIndex] = { id: targetUser.id, permissions: ['full_access'] };
                else guildData.whitelist.push({ id: targetUser.id, permissions: ['full_access'] });
            } else if (existingIndex !== -1) {
                if (!guildData.whitelist[existingIndex].permissions.includes(permission)) {
                    guildData.whitelist[existingIndex].permissions.push(permission);
                }
            } else {
                guildData.whitelist.push({ id: targetUser.id, permissions: [permission] });
            }
            saveData(data);

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Whitelist' })
                .setThumbnail(client.user.displayAvatarURL())
                .setTitle('User Whitelisted')
                .addFields(
                    { name: 'User', value: targetUser.tag, inline: false },
                    { name: 'Permission', value: getPermissionLabel(permission), inline: false },
                )
                .setFooter(getFooter());

            sendGlobalLog('whitelist', {
                header: 'Whitelist Change',
                title: 'User Whitelisted',
                lines: [
                    `Server : ${interaction.guild.name} (${interaction.guild.id})`,
                    `By : ${interaction.user.tag}`,
                    `Target : ${targetUser.tag}`,
                    `Permission : ${getPermissionLabel(permission)}`,
                ],
                thumbnailURL: interaction.guild.iconURL({ size: 128 }),
            }, null, interaction.guild);

            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'unwhitelist') {
            if (!isOwner) return ownerOnlyReply();
            const targetUser = interaction.options.getUser('user');
            const entry = guildData.whitelist.find(w => w.id === targetUser.id);
            if (!entry) return interaction.reply({ embeds: [simpleEmbed('This user is not in the whitelist.')], ephemeral: true });

            guildData.whitelist = guildData.whitelist.filter(w => w.id !== targetUser.id);
            saveData(data);

            sendGlobalLog('whitelist', {
                header: 'Whitelist Change',
                title: 'User Unwhitelisted',
                lines: [
                    `Server : ${interaction.guild.name} (${interaction.guild.id})`,
                    `By : ${interaction.user.tag}`,
                    `Target : ${targetUser.tag}`,
                ],
                thumbnailURL: interaction.guild.iconURL({ size: 128 }),
            }, null, interaction.guild);

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Permission' })
                .setTitle('User Unwhitelisted')
                .addFields(
                    { name: 'User', value: targetUser.tag, inline: false },
                    { name: 'Total Whitelisted', value: `${guildData.whitelist.length}`, inline: false },
                )
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'whitelistlist') {
            if (!isAllowed) return allowedOnlyReply();
            if (guildData.whitelist.length === 0) return interaction.reply({ embeds: [simpleEmbed('No users are whitelisted in this server.')] });

            const lines = [];
            for (const entry of guildData.whitelist) {
                const user = await client.users.fetch(entry.id).catch(() => null);
                const tag = user ? user.tag : 'Unknown User';
                const permLabels = entry.permissions.map(p => `\`${getPermissionLabel(p).toLowerCase()}\``).join(' ');
                lines.push(`**${tag}**\nPermissions: ${permLabels}`);
            }

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Whitelist' })
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setTitle('Whitelisted Users')
                .setDescription(safeDescription(lines.join('\n\n')))
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'bypass') {
            if (!isRealOwner) return realOwnerOnlyReply();
            const targetUser = interaction.options.getUser('user');

            if (targetUser.id === interaction.guild.ownerId) {
                return interaction.reply({ embeds: [simpleEmbed('This user is already the server owner.')], ephemeral: true });
            }

            if (!guildData.bypass.includes(targetUser.id)) {
                guildData.bypass.push(targetUser.id);
                saveData(data);
            }

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Bypass' })
                .setThumbnail(client.user.displayAvatarURL())
                .setTitle('User Bypassed')
                .setDescription(safeDescription(`${targetUser} can now use every owner-only command on this server, just like the server owner.\n\n⚠️ **This is dangerous.** Only grant bypass to someone you fully trust — they will be able to disable anti-nuke, manage the whitelist, and change server protection settings.`))
                .setFooter(getFooter());

            sendGlobalLog('whitelist', {
                header: 'Bypass Change',
                title: 'User Bypassed',
                lines: [
                    `Server : ${interaction.guild.name} (${interaction.guild.id})`,
                    `By : ${interaction.user.tag}`,
                    `Target : ${targetUser.tag}`,
                ],
                thumbnailURL: interaction.guild.iconURL({ size: 128 }),
            }, null, interaction.guild);

            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'unbypass') {
            if (!isRealOwner) return realOwnerOnlyReply();
            const targetUser = interaction.options.getUser('user');

            if (!guildData.bypass.includes(targetUser.id)) {
                return interaction.reply({ embeds: [simpleEmbed('This user does not have bypass.')], ephemeral: true });
            }

            guildData.bypass = guildData.bypass.filter(id => id !== targetUser.id);
            saveData(data);

            sendGlobalLog('whitelist', {
                header: 'Bypass Change',
                title: 'User Unbypassed',
                lines: [
                    `Server : ${interaction.guild.name} (${interaction.guild.id})`,
                    `By : ${interaction.user.tag}`,
                    `Target : ${targetUser.tag}`,
                ],
                thumbnailURL: interaction.guild.iconURL({ size: 128 }),
            }, null, interaction.guild);

            return interaction.reply({ embeds: [simpleEmbed(`${targetUser.tag} no longer has bypass.`)] });
        }

        if (cmd === 'bypasslist') {
            if (!isAllowed) return allowedOnlyReply();
            if (guildData.bypass.length === 0) return interaction.reply({ embeds: [simpleEmbed('No users have bypass on this server.')] });

            const lines = [];
            for (const userId of guildData.bypass) {
                const user = await client.users.fetch(userId).catch(() => null);
                lines.push(user ? user.tag : `Unknown User (${userId})`);
            }

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Bypass' })
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setTitle('Bypassed Users')
                .setDescription(safeDescription(lines.join('\n')))
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'autorole') {
            if (!isAllowed) return allowedOnlyReply();
            const role = interaction.options.getRole('role');

            if (!role) {
                guildData.autoRole = null;
                saveData(data);
                return interaction.reply({ embeds: [simpleEmbed('Auto Role Disabled')] });
            }

            const botMember = interaction.guild.members.me;
            if (!botMember.permissions.has('ManageRoles')) {
                return interaction.reply({ embeds: [simpleEmbed("I don't have the Manage Roles permission.")], ephemeral: true });
            }
            if (role.position >= botMember.roles.highest.position) {
                return interaction.reply({ embeds: [simpleEmbed(`I can't assign **${role.name}** because it's higher than my highest role.`)], ephemeral: true });
            }

            guildData.autoRole = role.id;
            saveData(data);
            return interaction.reply({ embeds: [simpleEmbed(`New members will automatically receive ${role}.`)] });
        }

        if (cmd === 'logs') {
            if (!isAllowed) return allowedOnlyReply();
            const category = interaction.options.getString('category');
            const channel = interaction.options.getChannel('channel');
            const enabled = interaction.options.getBoolean('enabled');

            guildData.logs[category].channelId = channel.id;
            guildData.logs[category].enabled = enabled;
            saveData(data);

            return interaction.reply({ embeds: [buildLogsCategoryEmbed(category, guildData.logs[category])] });
        }

        if (cmd === 'vc') {
            if (!isAllowed) return allowedOnlyReply();
            const trigger = interaction.options.getChannel('trigger');
            const category = interaction.options.getChannel('category');

            guildData.joinToCreate.triggerChannelId = trigger.id;
            guildData.joinToCreate.categoryId = category.id;
            saveData(data);

            return interaction.reply({ embeds: [buildJtcEmbed(guildData.joinToCreate)] });
        }

        if (cmd === 'role') {
            if (!canUseRoleCommand) return interaction.reply({ embeds: [rolePermEmbed('Only the owner and whitelisted users can use this command.')], ephemeral: true });

            const targetUser = interaction.options.getUser('user');
            const role = interaction.options.getRole('role');
            const target = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
            if (!target) return interaction.reply({ embeds: [rolePermEmbed('Could not find that member in this server.')], ephemeral: true });

            if (!isOwner) {
                const executorMember = interaction.member;
                const executorHighestRole = executorMember.roles.highest;
                const botHighestRole = interaction.guild.members.me.roles.highest;

                if (role.position >= executorHighestRole.position) {
                    return interaction.reply({ embeds: [rolePermEmbed(`You cannot assign **${role.name}** because it is higher than or equal to your highest role (**${executorHighestRole.name}**).`)], ephemeral: true });
                }
                if (role.position >= botHighestRole.position) {
                    return interaction.reply({ embeds: [rolePermEmbed(`I cannot assign **${role.name}** because it is higher than or equal to my highest role.`)], ephemeral: true });
                }
                const targetHighestRole = target.roles.highest;
                if (targetHighestRole.position >= executorHighestRole.position) {
                    return interaction.reply({ embeds: [rolePermEmbed(`You cannot manage roles for **${target.user.tag}** because their highest role (**${targetHighestRole.name}**) is higher than or equal to your highest role (**${executorHighestRole.name}**).`)], ephemeral: true });
                }
            }

            let added;
            try {
                if (target.roles.cache.has(role.id)) {
                    await target.roles.remove(role);
                    added = false;
                } else {
                    await target.roles.add(role);
                    added = true;
                }
            } catch (err) {
                return interaction.reply({ embeds: [rolePermEmbed('Failed to update the role.')], ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setTitle(added ? 'Role Added' : 'Role Removed')
                .addFields(
                    { name: 'User', value: target.user.tag, inline: false },
                    { name: 'Role', value: `${role}`, inline: false },
                )
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'wipe') {
            if (!isAllowed) return allowedOnlyReply();
            const amount = interaction.options.getInteger('amount');
            const clampedAmount = Math.min(amount, 100);

            await interaction.deferReply({ ephemeral: true });

            let deletedCount = 0;
            try {
                if (clampedAmount === 1) {
                    const recent = await interaction.channel.messages.fetch({ limit: 1 });
                    const toDelete = recent.first();
                    if (toDelete) {
                        await toDelete.delete();
                        deletedCount = 1;
                    }
                } else {
                    const deleted = await interaction.channel.bulkDelete(clampedAmount, true);
                    deletedCount = deleted.size;
                }
            } catch (err) {
                return interaction.editReply({ embeds: [simpleEmbed("Failed to delete messages. Messages older than 14 days can't be bulk deleted.")] });
            }

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Wipe' })
                .setTitle('Messages Deleted')
                .addFields(
                    { name: 'Amount', value: `${deletedCount}`, inline: true },
                    { name: 'Channel', value: `${interaction.channel}`, inline: true },
                )
                .setFooter(getFooter());
            return interaction.editReply({ embeds: [embed] });
        }

        if (cmd === 'status') {
            return interaction.reply({ embeds: [buildStatusEmbed(guildData, interaction.guild)] });
        }

        if (cmd === 'info') {
            const guild = interaction.guild;
            await guild.members.fetch();

            const owner = await guild.fetchOwner();
            const freshGuild = await guild.fetch().catch(() => guild);
            const bannerURL = freshGuild.bannerURL ? freshGuild.bannerURL({ size: 1024 }) : null;
            const totalMembers = guild.memberCount;
            const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd').size;
            const bots = guild.members.cache.filter(m => m.user.bot).size;
            const admins = guild.members.cache.filter(m => m.permissions.has('Administrator') && !m.user.bot).size;
            const createdDate = `${guild.createdAt.getMonth() + 1}/${guild.createdAt.getDate()}/${guild.createdAt.getFullYear()} (${getRelativeTime(guild.createdAt)})`;

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Server Information' })
                .setTitle(`Server Name: ${guild.name}`)
                .setThumbnail(guild.iconURL({ dynamic: true }))
                .addFields(
                    { name: 'Owner', value: owner.user.tag, inline: false },
                    { name: 'Server ID', value: `${guild.id}`, inline: false },
                    { name: 'Created', value: createdDate, inline: false },
                    { name: 'Total Members', value: `${totalMembers}`, inline: true },
                    { name: 'Online Members', value: `${onlineMembers}`, inline: true },
                    { name: 'Bots', value: `${bots}`, inline: true },
                    { name: 'Administrators', value: `${admins}`, inline: true },
                    { name: 'Total Channels', value: `${guild.channels.cache.size}`, inline: true },
                    { name: 'Total Roles', value: `${guild.roles.cache.size}`, inline: true },
                    { name: 'Boost Level', value: `${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`, inline: false },
                )
                .setFooter(getFooter());
            if (bannerURL) embed.setImage(bannerURL);

            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'av') {
            const target = interaction.options.getUser('user') || interaction.user;
            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Avatar' })
                .setTitle(target.tag)
                .setImage(target.displayAvatarURL({ size: 1024, dynamic: true }))
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'banner') {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const fullUser = await client.users.fetch(targetUser.id, { force: true }).catch(() => null);
            if (!fullUser || !fullUser.banner) return interaction.reply({ embeds: [simpleEmbed('This user has no banner set.')], ephemeral: true });

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Banner' })
                .setTitle(fullUser.tag)
                .setImage(fullUser.bannerURL({ size: 1024, dynamic: true }))
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'bot') {
            const fullBot = await client.users.fetch(client.user.id, { force: true }).catch(() => null);
            const bannerURL = fullBot && fullBot.banner ? fullBot.bannerURL({ size: 1024, dynamic: true }) : null;

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'About' })
                .setTitle(client.user.tag)
                .setDescription(safeDescription('This bot stops any nuke attempts on your server and includes various moderation commands.\n\nContact Support: https://discord.gg/s5rfU6Zj4c '))
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter(getFooter());
            if (bannerURL) embed.setImage(bannerURL);

            const inviteButton = new ButtonBuilder()
                .setLabel('Invite Me')
                .setStyle(ButtonStyle.Link)
                .setURL(BOT_INVITE_URL);
            const row = new ActionRowBuilder().addComponents(inviteButton);

            return interaction.reply({ embeds: [embed], components: [row] });
        }

        if (cmd === 'emojis') {
            const emojis = interaction.guild.emojis.cache;
            if (emojis.size === 0) return interaction.reply({ embeds: [simpleEmbed('This server has no custom emojis.')] });

            const staticEmojis = emojis.filter(e => !e.animated);
            const animatedEmojis = emojis.filter(e => e.animated);

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Server Emojis' })
                .setTitle(`Total: ${emojis.size} | Static: ${staticEmojis.size} | Animated: ${animatedEmojis.size}`)
                .setFooter(getFooter());

            let currentDesc = '';
            emojis.forEach(emoji => {
                const emojiDesc = `${emoji} \`:${emoji.name}:\`\n`;
                if ((currentDesc + emojiDesc).length <= 4096) currentDesc += emojiDesc;
            });
            embed.setDescription(safeDescription(currentDesc, 'No emojis'));

            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'stickers') {
            const stickers = interaction.guild.stickers.cache;
            if (stickers.size === 0) return interaction.reply({ embeds: [simpleEmbed('This server has no stickers.')] });

            const stickerList = stickers.map(s => `**${s.name}**\n${s.url}`).join('\n\n').slice(0, 4096);

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Server Stickers' })
                .setTitle(`Total: ${stickers.size}`)
                .setDescription(safeDescription(stickerList))
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'afk') {
            const reason = interaction.options.getString('reason') || 'No reason';
            guildData.afk[interaction.user.id] = { reason, timestamp: Date.now() };
            saveData(data);

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'AFK' })
                .setTitle('Set AFK')
                .setThumbnail(interaction.user.displayAvatarURL())
                .addFields(
                    { name: 'User', value: interaction.user.tag, inline: false },
                    { name: 'Reason', value: reason, inline: false },
                )
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'afklist') {
            const afkEntries = Object.entries(guildData.afk);
            if (afkEntries.length === 0) return interaction.reply({ embeds: [simpleEmbed('No users are currently AFK.')] });

            const fields = [];
            for (const [userId, afkInfo] of afkEntries) {
                const user = await client.users.fetch(userId).catch(() => null);
                const tag = user ? user.tag : 'Unknown User';
                const duration = formatDuration(Date.now() - afkInfo.timestamp);
                fields.push({ name: tag, value: `**Reason:** ${afkInfo.reason}\n**Duration:** ${duration}`, inline: false });
            }

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'AFK' })
                .setTitle('AFK List')
                .setThumbnail(client.user.displayAvatarURL())
                .addFields(fields)
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'rolelist') {
            const roles = interaction.guild.roles.cache
                .filter(r => r.id !== interaction.guild.id)
                .sort((a, b) => b.position - a.position)
                .map(r => `${r} - ${r.permissions.has('Administrator') ? 'Administrator' : 'No Administrator'}`)
                .join('\n');

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Role' })
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .setTitle('Role List')
                .setDescription(safeDescription(roles, 'No roles found.'))
                .setFooter(getFooter());
            return interaction.reply({ embeds: [embed] });
        }

        if (cmd === 'setprefix') {
            if (!isAllowed) return allowedOnlyReply();
            const prefix = interaction.options.getString('prefix');
            const result = applySetPrefix(guildData, prefix);
            if (!result.ok) return interaction.reply({ embeds: [simpleEmbed(result.error)], ephemeral: true });
            return interaction.reply({ embeds: [buildPrefixEmbed('Prefix Updated', guildData)] });
        }

        if (cmd === 'resetprefix') {
            if (!isAllowed) return allowedOnlyReply();
            guildData.prefix = null;
            saveData(data);
            return interaction.reply({ embeds: [buildPrefixEmbed('Prefix Reset', guildData)] });
        }

        if (cmd === 'setembedcolor') {
            if (!isOwner && !isAllowed) return allowedOnlyReply();
            if (!isPremium(guildData)) return premiumOnlyReply();
            const hexInput = interaction.options.getString('hex');
            const parsed = parseHexColor(hexInput);
            if (parsed === null) return interaction.reply({ embeds: [simpleEmbed(`\`${hexInput}\` is not a valid hex color. Try formats like \`#ff0000\`, \`ff0000\`, or \`f00\`.`)], ephemeral: true });
            guildData.embedColor = parsed;
            saveData(data);
            return interaction.reply({ embeds: [buildEmbedColorEmbed(guildData)] });
        }

        if (cmd === 'setprofile') {
            if (!isOwner && !isAllowed) return allowedOnlyReply();
            if (!isPremium(guildData)) return premiumOnlyReply();
            const url = interaction.options.getString('url');
            const attachment = interaction.options.getAttachment('attachment');
            await interaction.deferReply();
            const result = await setPerServerProfile(interaction.guild, 'avatar', url || attachment?.url);
            if (!result.ok) return interaction.editReply({ embeds: [simpleEmbed(result.error)] });
            guildData.perServerProfile.avatar = url || attachment?.url;
            saveData(data);
            return interaction.editReply({ embeds: [simpleEmbed('Per-server bot avatar updated for this server.')] });
        }

        if (cmd === 'setbanner') {
            if (!isOwner && !isAllowed) return allowedOnlyReply();
            if (!isPremium(guildData)) return premiumOnlyReply();
            const url = interaction.options.getString('url');
            const attachment = interaction.options.getAttachment('attachment');
            await interaction.deferReply();
            const result = await setPerServerProfile(interaction.guild, 'banner', url || attachment?.url);
            if (!result.ok) return interaction.editReply({ embeds: [simpleEmbed(result.error)] });
            guildData.perServerProfile.banner = url || attachment?.url;
            saveData(data);
            return interaction.editReply({ embeds: [simpleEmbed('Per-server bot banner updated for this server.')] });
        }

        if (cmd === 'resetprofile') {
            if (!isOwner && !isAllowed) return allowedOnlyReply();
            if (!isPremium(guildData)) return premiumOnlyReply();
            await interaction.deferReply();
            await resetPerServerProfile(interaction.guild, 'avatar');
            guildData.perServerProfile.avatar = null;
            saveData(data);
            return interaction.editReply({ embeds: [simpleEmbed('Per-server bot avatar reset to the global default.')] });
        }

        if (cmd === 'resetbanner') {
            if (!isOwner && !isAllowed) return allowedOnlyReply();
            if (!isPremium(guildData)) return premiumOnlyReply();
            await interaction.deferReply();
            await resetPerServerProfile(interaction.guild, 'banner');
            guildData.perServerProfile.banner = null;
            saveData(data);
            return interaction.editReply({ embeds: [simpleEmbed('Per-server bot banner reset to the global default.')] });
        }

        if (cmd === 'premium-add') {
            if (!BOT_OWNER_IDS.includes(interaction.user.id)) return botOwnerOnlyReply();
            const serverId = interaction.options.getString('serverid');
            const targetGuildData = getGuildData(serverId);
            targetGuildData.premium = true;
            saveData(data);
            const targetGuild = client.guilds.cache.get(serverId);
            return interaction.reply({ embeds: [simpleEmbed(`Premium granted to \`${serverId}\`${targetGuild ? ` (${targetGuild.name})` : ''}.`)] });
        }

        if (cmd === 'premium-remove') {
            if (!BOT_OWNER_IDS.includes(interaction.user.id)) return botOwnerOnlyReply();
            const serverId = interaction.options.getString('serverid');
            const targetGuildData = getGuildData(serverId);
            targetGuildData.premium = false;
            saveData(data);
            const targetGuild = client.guilds.cache.get(serverId);
            return interaction.reply({ embeds: [simpleEmbed(`Premium removed from \`${serverId}\`${targetGuild ? ` (${targetGuild.name})` : ''}.`)] });
        }

        if (cmd === 'premiumlist') {
            if (!BOT_OWNER_IDS.includes(interaction.user.id)) return botOwnerOnlyReply();
            return interaction.reply({ embeds: [buildPremiumListEmbed()] });
        }

        return;
    }

    if (!interaction.guild) return;
    if (!interaction.isStringSelectMenu() && !interaction.isChannelSelectMenu() && !interaction.isButton()) return;

    if (interaction.isStringSelectMenu() && interaction.customId === 'help_category_select') {
        const gData = getGuildData(interaction.guild.id);
        const prefix = getPrefix(gData);
        const container = buildHelpCategoryContainer(prefix, interaction.values[0]);
        await interaction.update({ components: [container, ...buildHelpSelectRow()], flags: MessageFlags.IsComponentsV2 });
        return;
    }

    const guildData = getGuildData(interaction.guild.id);

    if (interaction.isStringSelectMenu() && interaction.customId === 'setup_category_select') {
        if (!BOT_OWNER_IDS.includes(interaction.user.id)) {
            return interaction.reply({ embeds: [simpleEmbed('Only the bot owner can use this.')], ephemeral: true });
        }
        const category = interaction.values[0];
        await interaction.update({
            embeds: [buildSetupEmbed()],
            components: buildSetupChannelComponents(category),
        });
        return;
    }

    if (interaction.isChannelSelectMenu() && interaction.customId.startsWith('setup_channel_select_')) {
        if (!BOT_OWNER_IDS.includes(interaction.user.id)) {
            return interaction.reply({ embeds: [simpleEmbed('Only the bot owner can use this.')], ephemeral: true });
        }
        const category = interaction.customId.replace('setup_channel_select_', '');
        const g = getGlobalData();
        g.logs[category] = interaction.values[0];
        saveData(data);

        await interaction.update({
            embeds: [buildSetupEmbed()],
            components: buildSetupComponents(),
        });
        return;
    }

    if (interaction.isStringSelectMenu() && interaction.customId.startsWith('whitelist_select_')) {
        const isOwner = interaction.user.id === interaction.guild.ownerId || hasBypass(guildData, interaction.user.id);
        if (!isOwner) {
            return interaction.reply({ embeds: [simpleEmbed('Only the server owner can use this.')], ephemeral: true });
        }

        const userId = interaction.customId.replace('whitelist_select_', '');
        const selectedPerms = interaction.values;

        if (selectedPerms.includes('full_access')) {
            const existingIndex = guildData.whitelist.findIndex(w => w.id === userId);
            if (existingIndex !== -1) {
                guildData.whitelist[existingIndex] = { id: userId, permissions: ['full_access'] };
            } else {
                guildData.whitelist.push({ id: userId, permissions: ['full_access'] });
            }
        } else {
            const existingIndex = guildData.whitelist.findIndex(w => w.id === userId);
            if (existingIndex !== -1) {
                guildData.whitelist[existingIndex] = { id: userId, permissions: selectedPerms };
            } else {
                guildData.whitelist.push({ id: userId, permissions: selectedPerms });
            }
        }

        saveData(data);

        const user = await client.users.fetch(userId).catch(() => null);
        const permLabels = selectedPerms.map(p => getPermissionLabel(p)).join('\n');

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Whitelist' })
            .setThumbnail(client.user.displayAvatarURL())
            .setTitle('User Whitelisted')
            .addFields(
                { name: 'User', value: user ? user.tag : 'Unknown', inline: false },
                { name: 'Permissions', value: permLabels, inline: false },
            )
            .setFooter(getFooter());

        await interaction.update({ embeds: [embed], components: [] });

        sendGlobalLog('whitelist', {
            header: 'Whitelist Change',
            title: 'User Whitelisted',
            lines: [
                `Server : ${interaction.guild.name} (${interaction.guild.id})`,
                `By : ${interaction.user.tag}`,
                `Target : ${user ? user.tag : userId}`,
                `Permissions : ${permLabels}`,
            ],
            thumbnailURL: interaction.guild.iconURL({ size: 128 }),
        }, null, interaction.guild);
        return;
    }

    const isOwner = interaction.user.id === interaction.guild.ownerId || hasBypass(guildData, interaction.user.id);
    const isAllowed = isOwner || hasWhitelistPermission(guildData, interaction.user.id, 'full_access');

    if (!isAllowed) {
        return interaction.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this.')], ephemeral: true });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'logs_category_select') {
        const category = interaction.values[0];
        const config = guildData.logs[category];

        await interaction.update({
            embeds: [buildLogsCategoryEmbed(category, config)],
            components: buildLogsComponents(category),
        });
    }

    if (interaction.isChannelSelectMenu() && interaction.customId.startsWith('logs_channel_select_')) {
        const category = interaction.customId.replace('logs_channel_select_', '');
        guildData.logs[category].channelId = interaction.values[0];
        saveData(data);

        await interaction.update({
            embeds: [buildLogsCategoryEmbed(category, guildData.logs[category])],
            components: buildLogsComponents(category),
        });
    }

    if (interaction.isButton() && interaction.customId.startsWith('logs_enable_')) {
        const category = interaction.customId.replace('logs_enable_', '');
        guildData.logs[category].enabled = true;
        saveData(data);

        await interaction.update({
            embeds: [buildLogsCategoryEmbed(category, guildData.logs[category])],
            components: buildLogsComponents(category),
        });
    }

    if (interaction.isButton() && interaction.customId.startsWith('logs_disable_')) {
        const category = interaction.customId.replace('logs_disable_', '');
        guildData.logs[category].enabled = false;
        saveData(data);

        await interaction.update({
            embeds: [buildLogsCategoryEmbed(category, guildData.logs[category])],
            components: buildLogsComponents(category),
        });
    }

    if (interaction.isChannelSelectMenu() && interaction.customId === 'jtc_trigger_select') {
        guildData.joinToCreate.triggerChannelId = interaction.values[0];
        saveData(data);

        await interaction.update({
            embeds: [buildJtcEmbed(guildData.joinToCreate)],
            components: buildJtcComponents(),
        });
    }

    if (interaction.isChannelSelectMenu() && interaction.customId === 'jtc_category_select') {
        guildData.joinToCreate.categoryId = interaction.values[0];
        saveData(data);

        await interaction.update({
            embeds: [buildJtcEmbed(guildData.joinToCreate)],
            components: buildJtcComponents(),
        });
    }

    if (interaction.isChannelSelectMenu() && interaction.customId === 'sentembed_channel_select') {
        if (!isPremium(guildData)) {
            return interaction.update({ embeds: [simpleEmbed('This is a premium-only command. This server does not have ProtonX Premium.')], components: [] });
        }
        if (!ensureDraft(guildData)) {
            return interaction.update({ embeds: [simpleEmbed('The embed draft was cleared before you picked a channel. Start over with `!xsetembed`.')], components: [] });
        }

        const draft = guildData.embedDraft;
        if (!draft.author || !draft.description || !draft.footer) {
            return interaction.update({ embeds: [simpleEmbed('Your draft needs an author, a message, and a footer before it can be sent.')], components: [] });
        }

        const targetChannels = interaction.values
            .map(id => interaction.guild.channels.cache.get(id))
            .filter(Boolean);

        const resultEmbed = await sendDraftToChannels(interaction.guild, draft, targetChannels);
        await interaction.update({ embeds: [resultEmbed], components: [] });
    }

    if (interaction.isChannelSelectMenu() && interaction.customId === 'antilinkbypass_category_select') {
        const selectedIds = interaction.values;
        for (const id of selectedIds) {
            if (!guildData.antiLink.bypassCategories.includes(id)) {
                guildData.antiLink.bypassCategories.push(id);
            }
        }
        saveData(data);

        await interaction.update({
            embeds: [buildantilinkBypassEmbed(guildData.antiLink.bypassCategories)],
            components: [],
        });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'aspam_threshold_select') {
        guildData.antiSpam.threshold = parseInt(interaction.values[0], 10);
        saveData(data);

        await interaction.update({
            embeds: [buildAspamTimeoutEmbed(guildData.antiSpam)],
            components: buildAspamTimeoutComponents(),
        });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'aspam_timeout_select') {
        guildData.antiSpam.timeoutMs = parseInt(interaction.values[0], 10);
        guildData.antiSpam.enabled = true;
        saveData(data);

        await interaction.update({
            embeds: [buildAspamSummaryEmbed(guildData.antiSpam)],
            components: [],
        });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'antilink_on_select') {
        const category = interaction.values[0];
        guildData.antiLink[category] = true;
        saveData(data);

        await interaction.update({
            embeds: [buildantilinkStatusEmbed(guildData.antiLink, `${antiLinkLabels[category]} Anti-Link Enabled`)],
            components: [],
        });
    }

    if (interaction.isStringSelectMenu() && interaction.customId === 'antilink_off_select') {
        const category = interaction.values[0];
        guildData.antiLink[category] = false;
        saveData(data);

        await interaction.update({
            embeds: [buildantilinkStatusEmbed(guildData.antiLink, `${antiLinkLabels[category]} Anti-Link Disabled`)],
            components: [],
        });
    }
});

function buildAspamThresholdEmbed() {
    return new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Anti-Spam' })
        .setTitle('Select Message Threshold')
        .setDescription(safeDescription('Choose how many consecutive messages count as spam.'))
        .setFooter(getFooter());
}

function buildAspamThresholdComponents() {
    const options = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100].map(n => ({
        label: `${n} messages`,
        value: `${n}`,
    }));

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('aspam_threshold_select')
        .setPlaceholder('Select message threshold')
        .addOptions(options);

    return [new ActionRowBuilder().addComponents(selectMenu)];
}

function buildAspamTimeoutEmbed(config) {
    return new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Anti-Spam' })
        .setTitle('Select Timeout Duration')
        .setDescription(safeDescription(`Threshold set to **${config.threshold} messages**.\nNow choose the timeout duration for offenders.`))
        .setFooter(getFooter());
}

function buildAspamTimeoutComponents() {
    const durations = [
        { label: '60 seconds', value: `${60 * 1000}` },
        { label: '5 minutes', value: `${5 * 60 * 1000}` },
        { label: '10 minutes', value: `${10 * 60 * 1000}` },
        { label: '30 minutes', value: `${30 * 60 * 1000}` },
        { label: '1 hour', value: `${60 * 60 * 1000}` },
        { label: '6 hours', value: `${6 * 60 * 60 * 1000}` },
        { label: '1 day', value: `${24 * 60 * 60 * 1000}` },
        { label: '1 week', value: `${7 * 24 * 60 * 60 * 1000}` },
    ];

    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('aspam_timeout_select')
        .setPlaceholder('Select timeout duration')
        .addOptions(durations);

    return [new ActionRowBuilder().addComponents(selectMenu)];
}

function buildAspamSummaryEmbed(config) {
    return new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Anti-Spam' })
        .setTitle('Anti-Spam Configured')
        .addFields(
            { name: 'Threshold', value: `${config.threshold} messages`, inline: true },
            { name: 'Timeout', value: formatDuration(config.timeoutMs), inline: true },
            { name: 'Status', value: config.enabled ? 'Enabled' : 'Disabled (use !xantispam-on)', inline: false },
        )
        .setFooter(getFooter());
}

function buildantilinkStatusEmbed(config, title) {
    return new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'Anti-Link' })
        .setTitle(title)
        .addFields(
            { name: 'Discord', value: config.discord ? 'On' : 'Off', inline: true },
            { name: 'Image Link', value: config.image ? 'On' : 'Off', inline: true },
            { name: 'All Links', value: config.all ? 'On' : 'Off', inline: true },
        )
        .setFooter(getFooter());
}

function buildantilinkSelectComponents(customId) {
    const selectMenu = new StringSelectMenuBuilder()
        .setCustomId(customId)
        .setPlaceholder('Select a category')
        .addOptions(
            { label: 'Discord', value: 'discord' },
            { label: 'Image Link', value: 'image' },
            { label: 'All Links', value: 'all' },
        );

    return [new ActionRowBuilder().addComponents(selectMenu)];
}

function buildStatusEmbed(guildData, guild) {
    const onOff = (v) => v ? 'on' : 'off';

    const botMember = guild.members.me;
    const highestRole = guild.roles.cache
        .filter(r => r.id !== guild.id)
        .sort((a, b) => b.position - a.position)
        .first();
    const isTopRole = highestRole && botMember.roles.highest.id === highestRole.id;
    const allPermissionFlags = Object.values(PermissionsBitField.Flags);
    const hasAllPerms = allPermissionFlags.every(flag => botMember.permissions.has(flag));

    const embed = new EmbedBuilder()
        .setColor(DARK_GRAY)
        .setAuthor({ name: 'ProtonX' })
        .addFields(
            { name: 'Anti-Nuke', value: `\`${onOff(guildData.enabled)}\``, inline: false },
            { name: 'Anti Bot/Webhook', value: `\`${onOff(guildData.antiBot)}\``, inline: false },
            {
                name: 'Anti-Link',
                value: `Discord: \`${onOff(guildData.antiLink.discord)}\`  Image: \`${onOff(guildData.antiLink.image)}\`  All links: \`${onOff(guildData.antiLink.all)}\``,
                inline: false,
            },
            {
                name: 'Anti-Spam',
                value: guildData.antiSpam.enabled
                    ? `\`on\`  ${guildData.antiSpam.threshold} messages / ${formatDuration(guildData.antiSpam.timeoutMs)}`
                    : '`off`',
                inline: false,
            },
            {
                name: 'Logs',
                value:
                    `Message: \`${onOff(guildData.logs.message.enabled)}\`  Profile: \`${onOff(guildData.logs.profile.enabled)}\`\n` +
                    `Voice: \`${onOff(guildData.logs.voice.enabled)}\`  Member: \`${onOff(guildData.logs.member.enabled)}\``,
                inline: false,
            },
            {
                name: 'Prefix',
                value: getActivePrefixesLabel(guildData),
                inline: false,
            },
            {
                name: 'Premium',
                value: isPremium(guildData) ? '`active` ' : '`inactive`',
                inline: false,
            },
            {
                name: 'Bypassed Users',
                value: `${guildData.bypass ? guildData.bypass.length : 0}`,
                inline: false,
            },
            {
                name: 'Setup Status',
                value: `Role position: ${isTopRole ? '✓ At the top' : '✗ Not at the top'}\nRole permissions: ${hasAllPerms ? '✓ Granted' : '✗ Missing'}`,
                inline: false,
            },
        )
        .setFooter(getFooter());

    return embed;
}

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.guild) return;

    const guildData = getGuildData(message.guild.id);

    if (guildData.antiLink) {
        const linkCategory = detectLinkCategory(message.content);
        if (linkCategory && guildData.antiLink[linkCategory]) {
            const inBypassCategory = message.channel.parentId && guildData.antiLink.bypassCategories.includes(message.channel.parentId);
            const isOwner = message.author.id === message.guild.ownerId;
            const bypassed = isOwner || inBypassCategory || hasWhitelistPermission(guildData, message.author.id, 'link_access');

            if (!bypassed) {
                await deleteMessageSafely(message);

                const container = buildLogContainerV2('Anti-Link', `${antiLinkLabels[linkCategory]} Link Deleted`, [
                    `User : ${message.author.tag}`,
                    `Channel : ${message.channel}`,
                    `Content : ${message.content.slice(0, 1000) || 'No content'}`,
                ], getFooter().text, message.author.displayAvatarURL());

                await message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
                return;
            }
        }
    }

    if (guildData.antiSpam && guildData.antiSpam.enabled && guildData.antiSpam.threshold && guildData.antiSpam.timeoutMs) {
        const isOwner = message.author.id === message.guild.ownerId;
        const bypassed = isOwner || hasWhitelistPermission(guildData, message.author.id, 'full_access');

        if (!bypassed) {
            const key = getSpamKey(message.channel.id, message.author.id);
            const now = Date.now();
            let entry = antiSpamTracker.get(key);

            if (!entry || now - entry.lastMessageTime > SPAM_COOLDOWN_MS) {
                entry = { messageIds: [], lastMessageTime: now };
            }

            entry.messageIds.push(message.id);
            entry.lastMessageTime = now;

            antiSpamTracker.set(key, entry);

            if (entry.messageIds.length >= guildData.antiSpam.threshold) {
                const idsToDelete = [...entry.messageIds];
                antiSpamTracker.delete(key);

                try {
                    if (message.channel.bulkDelete) {
                        await message.channel.bulkDelete(idsToDelete, true).catch(async () => {
                            for (const id of idsToDelete) {
                                const msg = await message.channel.messages.fetch(id).catch(() => null);
                                if (msg) await deleteMessageSafely(msg);
                            }
                        });
                    }
                } catch (err) {
                    console.log(`Failed to delete spam messages: ${err.message}`);
                }

                const member = await message.guild.members.fetch(message.author.id).catch(() => null);
                let timedOut = false;
                if (member && member.moderatable) {
                    try {
                        await member.timeout(guildData.antiSpam.timeoutMs, 'Anti-Spam: message spam detected');
                        timedOut = true;
                    } catch (err) {
                        console.log(`Failed to timeout ${message.author.tag}: ${err.message}`);
                    }
                }

                const container = buildLogContainerV2('Anti-Spam', 'Spam Detected', [
                    `User : ${message.author.tag}`,
                    `Channel : ${message.channel}`,
                    `Messages : ${idsToDelete.length}`,
                    `Timeout : ${timedOut ? formatDuration(guildData.antiSpam.timeoutMs) : 'Failed'}`,
                ], getFooter().text, message.author.displayAvatarURL());

                await message.channel.send({ components: [container], flags: MessageFlags.IsComponentsV2 }).catch(() => {});
                return;
            }
        }
    }

    const afkData = guildData.afk[message.author.id];
    if (afkData) {
        const duration = Date.now() - afkData.timestamp;
        delete guildData.afk[message.author.id];
        saveData(data);

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'AFK' })
            .setTitle('AFK Removed')
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                { name: 'User', value: `${message.author.tag}`, inline: false },
                { name: 'Duration', value: formatDuration(duration), inline: false },
            )
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
    }

    if (message.mentions.users.size > 0) {
        for (const mentionedUser of message.mentions.users.values()) {
            if (mentionedUser.bot) continue;
            if (mentionedUser.id === message.author.id) continue;

            const mentionedAfk = guildData.afk[mentionedUser.id];
            if (mentionedAfk) {
                const duration = formatDuration(Date.now() - mentionedAfk.timestamp);
                const embed = new EmbedBuilder()
                    .setColor(DARK_GRAY)
                    .setAuthor({ name: 'AFK' })
                    .setTitle('User is AFK')
                    .setThumbnail(mentionedUser.displayAvatarURL())
                    .addFields(
                        { name: 'User', value: `${mentionedUser.tag}`, inline: false },
                        { name: 'Reason', value: mentionedAfk.reason, inline: false },
                        { name: 'Duration', value: duration, inline: false },
                    )
                    .setFooter(getFooter());

                message.reply({ embeds: [embed] });
            }
        }
    }

    if (message.content === '!xjoin' || message.content.startsWith('!xjoin ')) {
        if (!BOT_OWNER_IDS.includes(message.author.id)) {
            return message.reply({ embeds: [simpleEmbed('You are not authorized to use this command.')] });
        }

        const voiceChannel = message.member.voice.channel;
        if (!voiceChannel) {
            return message.reply({ embeds: [simpleEmbed('You need to be in a voice channel first.')] });
        }

        const permissions = voiceChannel.permissionsFor(message.guild.members.me);
        if (!permissions.has('Connect') || !permissions.has('Speak')) {
            return message.reply({ embeds: [simpleEmbed('I don\'t have permission to join or speak in that voice channel.')] });
        }

        try {
            joinVoiceChannel({
                channelId: voiceChannel.id,
                guildId: message.guild.id,
                adapterCreator: message.guild.voiceAdapterCreator,
                selfDeaf: true,
                selfMute: true,
            });

            message.reply({ embeds: [simpleEmbed(`Joined ${voiceChannel.name}.`)] });
        } catch (err) {
            console.log(`Failed to join VC: ${err.message}`);
            message.reply({ embeds: [simpleEmbed(`Failed to join the voice channel: ${err.message}`)] });
        }

        return;
    }

    if (message.content.startsWith('!xget ') && BOT_OWNER_IDS.includes(message.author.id)) {
        const text = message.content.slice(6).trim();
        if (!text) return;

        await message.delete().catch(() => {});
        message.channel.send({ content: text, allowedMentions: { parse: [] } }).catch(() => {});
        return;
    }

    if (message.content.startsWith('!xa ') && BOT_OWNER_IDS.includes(message.author.id)) {
        const announceMessage = message.content.slice(4).trim();
        if (!announceMessage) return;

        try {
            await message.delete();
        } catch (err) {}

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'ProtonX' })
            .setThumbnail(client.user.displayAvatarURL())
            .setDescription(safeDescription(announceMessage))
            .setFooter(getFooter());

        const inviteButton = new ButtonBuilder()
            .setLabel('Invite Me')
            .setStyle(ButtonStyle.Link)
            .setURL(BOT_INVITE_URL);
        const row = new ActionRowBuilder().addComponents(inviteButton);

        message.channel.send({ embeds: [embed], components: [row] }).catch(() => {});
        return;
    }

    if (message.content === '!xping') {
        if (!BOT_OWNER_IDS.includes(message.author.id)) return;

        const sent = await message.reply({ content: 'Pinging...' });
        const ping = sent.createdTimestamp - message.createdTimestamp;

        const uptime = process.uptime();
        const uptimeFormatted = formatDuration(uptime * 1000);

        const memoryUsage = process.memoryUsage();
        const heapUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
        const heapTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
        const rss = (memoryUsage.rss / 1024 / 1024).toFixed(2);

        const cpuUsage = os.loadavg();
        const cpuCount = os.cpus().length;
        const osInfo = `${os.type()} ${os.release()}`;
        const platform = os.platform();
        const arch = os.arch();

        const totalMemory = (os.totalmem() / 1024 / 1024 / 1024).toFixed(2);
        const freeMemory = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
        const usedMemory = (totalMemory - freeMemory).toFixed(2);

        const nodeVersion = process.version;
        const discordJsVersion = require('discord.js').version;

        const premiumCount = countPremiumServers();

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Bot Status' })
            .setTitle('ProtonX System Information')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(
                { name: 'Latency', value: `${ping}ms`, inline: true },
                { name: 'API Ping', value: `${client.ws.ping}ms`, inline: true },
                { name: 'Uptime', value: uptimeFormatted, inline: true },
                { name: 'Servers', value: `${client.guilds.cache.size}`, inline: true },
                { name: 'Premium Servers', value: `${premiumCount}`, inline: true },
                { name: 'Users', value: `${client.users.cache.size}`, inline: true },
                { name: 'Channels', value: `${client.channels.cache.size}`, inline: true },
                { name: 'Memory (Heap)', value: `${heapUsed} MB / ${heapTotal} MB`, inline: true },
                { name: 'Memory (RSS)', value: `${rss} MB`, inline: true },
                { name: 'System Memory', value: `${usedMemory} GB / ${totalMemory} GB`, inline: true },
                { name: 'CPU Load (1m)', value: `${cpuUsage[0].toFixed(2)}`, inline: true },
                { name: 'CPU Load (5m)', value: `${cpuUsage[1].toFixed(2)}`, inline: true },
                { name: 'CPU Load (15m)', value: `${cpuUsage[2].toFixed(2)}`, inline: true },
                { name: 'CPU Cores', value: `${cpuCount}`, inline: true },
                { name: 'OS', value: osInfo, inline: false },
                { name: 'Platform', value: `${platform} (${arch})`, inline: true },
                { name: 'Node.js', value: nodeVersion, inline: true },
                { name: 'Discord.js', value: `v${discordJsVersion}`, inline: true },
            )
            .setFooter(getFooter());

        await sent.edit({ content: null, embeds: [embed] });
        return;
    }

    if (message.content === '!xserverlist') {
        if (!BOT_OWNER_IDS.includes(message.author.id)) return;

        const guilds = client.guilds.cache;
        const fields = [];

        for (const guild of guilds.values()) {
            const owner = await guild.fetchOwner().catch(() => null);
            const ownerTag = owner ? owner.user.tag : 'Unknown';
            fields.push({
                name: guild.name,
                value: `**Owner:** ${ownerTag}\n**ID:** ${guild.id}\n**Members:** ${guild.memberCount}`,
                inline: false,
            });
        }

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Server List' })
            .setTitle(`Total Servers: ${guilds.size}`)
            .addFields(fields)
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    const customPrefix = guildData.prefix;
    const matchedPrefix = (customPrefix && message.content.startsWith(customPrefix))
        ? customPrefix
        : (message.content.startsWith(PREFIX) ? PREFIX : null);
    if (!matchedPrefix) return;
    const currentPrefix = matchedPrefix;

    const args = message.content.slice(currentPrefix.length).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const isRealOwner = message.author.id === message.guild.ownerId;
    const isOwner = isRealOwner || hasBypass(guildData, message.author.id);
    const isAllowed = isOwner || hasWhitelistPermission(guildData, message.author.id, 'full_access');
    const canUseRoleCommand = isOwner || hasRoleCommandAccess(guildData, message.author.id);
    const premiumOnly = () => message.reply({ embeds: [simpleEmbed('This is a premium-only command. This server does not have ProtonX Premium.')] });
    const botOwnerOnly = () => message.reply({ embeds: [simpleEmbed('Only the bot owner can use this command.')] });

    sendGlobalLog('commands', {
        header: 'Command Log',
        title: `${currentPrefix}${command}`,
        lines: [
            `User : ${message.author.tag} (${message.author.id})`,
            `Server : ${message.guild.name} (${message.guild.id})`,
            `Channel : ${message.channel}`,
            `Full Message : ${message.content.slice(0, 1000)}`,
        ],
        thumbnailURL: message.guild.iconURL({ size: 128 }),
    }, null, message.guild);

    if (command === 'setup') {
        if (!BOT_OWNER_IDS.includes(message.author.id)) return;

        message.reply({
            embeds: [buildSetupEmbed()],
            components: buildSetupComponents(),
        });
        return;
    }

    if (command === 'status') {
        message.reply({ embeds: [buildStatusEmbed(guildData, message.guild)] });
        return;
    }

    if (command === 'help') {
        const prefix = getPrefix(guildData);
        const container = buildHelpMainContainer(prefix);

        message.reply({
            components: [container, ...buildHelpSelectRow()],
            flags: MessageFlags.IsComponentsV2,
        });
        return;
    }

    if (command === 'av') {
        const target = message.mentions.users.first() || message.author;

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Avatar' })
            .setTitle(`${target.tag}`)
            .setImage(target.displayAvatarURL({ size: 1024, dynamic: true }))
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'bot') {
        const fullBot = await client.users.fetch(client.user.id, { force: true }).catch(() => null);
        const bannerURL = fullBot && fullBot.banner ? fullBot.bannerURL({ size: 1024, dynamic: true }) : null;

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'About' })
            .setTitle(client.user.tag)
            .setDescription(safeDescription('This bot stops any nuke attempts on your server and includes various moderation commands.\n\nContact Support: https://discord.gg/s5rfU6Zj4c '))
            .setThumbnail(client.user.displayAvatarURL())
            .setFooter(getFooter());

        if (bannerURL) {
            embed.setImage(bannerURL);
        }

        const inviteButton = new ButtonBuilder()
            .setLabel('Invite Me')
            .setStyle(ButtonStyle.Link)
            .setURL('https://discord.com/oauth2/authorize?client_id=1527346208232706148&permissions=8&integration_type=0&scope=applications.commands+bot');

        const row = new ActionRowBuilder().addComponents(inviteButton);

        message.reply({ embeds: [embed], components: [row] });
        return;
    }

    if (command === 'banner') {
        const targetUser = message.mentions.users.first() || message.author;
        const fullUser = await client.users.fetch(targetUser.id, { force: true }).catch(() => null);

        if (!fullUser || !fullUser.banner) {
            return message.reply({ embeds: [simpleEmbed('This user has no banner set.')] });
        }

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Banner' })
            .setTitle(`${fullUser.tag}`)
            .setImage(fullUser.bannerURL({ size: 1024, dynamic: true }))
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'info') {
        const guild = message.guild;

        await guild.members.fetch();

        const owner = await guild.fetchOwner();
        const freshGuild = await guild.fetch().catch(() => guild);
        const bannerURL = freshGuild.bannerURL ? freshGuild.bannerURL({ size: 1024 }) : null;
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(m => m.presence?.status === 'online' || m.presence?.status === 'idle' || m.presence?.status === 'dnd').size;
        const bots = guild.members.cache.filter(m => m.user.bot).size;
        const admins = guild.members.cache.filter(m => m.permissions.has('Administrator') && !m.user.bot).size;
        const createdDate = `${guild.createdAt.getMonth() + 1}/${guild.createdAt.getDate()}/${guild.createdAt.getFullYear()} (${getRelativeTime(guild.createdAt)})`;

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({
                name: 'Server Information',
            })
            .setTitle(`Server Name: ${guild.name}`)
            .setThumbnail(guild.iconURL({ dynamic: true }))
            .addFields(
                { name: 'Owner', value: `${owner.user.tag}`, inline: false },
                { name: 'Server ID', value: `${guild.id}`, inline: false },
                { name: 'Created', value: createdDate, inline: false },
                { name: 'Total Members', value: `${totalMembers}`, inline: true },
                { name: 'Online Members', value: `${onlineMembers}`, inline: true },
                { name: 'Bots', value: `${bots}`, inline: true },
                { name: 'Administrators', value: `${admins}`, inline: true },
                { name: 'Total Channels', value: `${guild.channels.cache.size}`, inline: true },
                { name: 'Total Roles', value: `${guild.roles.cache.size}`, inline: true },
                { name: 'Boost Level', value: `${guild.premiumTier} (${guild.premiumSubscriptionCount || 0} boosts)`, inline: false },
            )
            .setFooter(getFooter());

        if (bannerURL) {
            embed.setImage(bannerURL);
        }

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'vc') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }

        message.reply({
            embeds: [buildJtcEmbed(guildData.joinToCreate)],
            components: buildJtcComponents(),
        });
        return;
    }

    if (command === 'role') {
        if (!canUseRoleCommand) {
            return message.reply({ embeds: [rolePermEmbed('Only the owner and whitelisted users can use this command.')] });
        }

        let target = message.mentions.members.first();
        let roleQuery;

        if (target) {
            roleQuery = args.slice(1).join(' ');
        } else {
            const userQuery = args[0];
            if (userQuery) {
                target = message.guild.members.cache.find(m => m.user.username.toLowerCase() === userQuery.toLowerCase())
                    || message.guild.members.cache.find(m => m.displayName.toLowerCase() === userQuery.toLowerCase())
                    || message.guild.members.cache.find(m => m.user.username.toLowerCase().includes(userQuery.toLowerCase()))
                    || message.guild.members.cache.find(m => m.displayName.toLowerCase().includes(userQuery.toLowerCase()));
            }
            roleQuery = args.slice(1).join(' ');
        }

        if (!target) {
            return message.reply({ embeds: [rolePermEmbed('Please mention or provide a valid username.')] });
        }

        if (!roleQuery) {
            return message.reply({ embeds: [rolePermEmbed('Please provide a role name.')] });
        }

        const roleMention = message.mentions.roles.first();
        let role;
        if (roleMention) {
            role = roleMention;
        } else {
            role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleQuery.toLowerCase())
                || message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleQuery.toLowerCase()));
        }

        if (!role) {
            return message.reply({ embeds: [rolePermEmbed('No matching role found.')] });
        }

        if (!isOwner) {
            const executorMember = message.member;
            const executorHighestRole = executorMember.roles.highest;
            const targetRole = role;
            const botHighestRole = message.guild.members.me.roles.highest;

            if (targetRole.position >= executorHighestRole.position) {
                return message.reply({ embeds: [rolePermEmbed(`You cannot assign **${targetRole.name}** because it is higher than or equal to your highest role (**${executorHighestRole.name}**).`)] });
            }

            if (targetRole.position >= botHighestRole.position) {
                return message.reply({ embeds: [rolePermEmbed(`I cannot assign **${targetRole.name}** because it is higher than or equal to my highest role.`)] });
            }

            const targetHighestRole = target.roles.highest;
            if (targetHighestRole.position >= executorHighestRole.position) {
                return message.reply({ embeds: [rolePermEmbed(`You cannot manage roles for **${target.user.tag}** because their highest role (**${targetHighestRole.name}**) is higher than or equal to your highest role (**${executorHighestRole.name}**).`)] });
            }
        }

        let added;
        try {
            if (target.roles.cache.has(role.id)) {
                await target.roles.remove(role);
                added = false;
            } else {
                await target.roles.add(role);
                added = true;
            }
        } catch (err) {
            return message.reply({ embeds: [rolePermEmbed('Failed to update the role.')] });
        }

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setTitle(added ? 'Role Added' : 'Role Removed')
            .addFields(
                { name: 'User', value: `${target.user.tag}`, inline: false },
                { name: 'Role', value: `${role}`, inline: false },
            )
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'rolelist') {
        const roles = message.guild.roles.cache
            .filter(r => r.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .map(r => `${r} - ${r.permissions.has('Administrator') ? 'Administrator' : 'No Administrator'}`)
            .join('\n');

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Role' })
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTitle('Role List')
            .setDescription(safeDescription(roles, 'No roles found.'))
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'anti-on') {
        if (!isOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the server owner can use this command.')] });
        }

        guildData.enabled = true;
        saveData(data);

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Protection Status' })
            .setThumbnail(client.user.displayAvatarURL())
            .setTitle('Anti-Nuke Enabled')
            .addFields(
                { name: 'Create Channel', value: 'On', inline: true },
                { name: 'Delete Channel', value: 'On', inline: true },
                { name: 'Create Role', value: 'On', inline: true },
                { name: 'Delete Role', value: 'On', inline: true },
                { name: 'Kick Member', value: 'On', inline: true },
                { name: 'Ban Member', value: 'On', inline: true },
                { name: 'Grant Admin Perms', value: 'On', inline: true },
                { name: 'Change Server Name/Icon', value: 'On', inline: true },
                { name: 'Create Webhook', value: 'On', inline: true },
                { name: 'Whitelisted Users', value: `${guildData.whitelist.length}`, inline: false },
            )
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });

        const botMember = message.guild.members.me;
        const highestRole = message.guild.roles.cache
            .filter(r => r.id !== message.guild.id)
            .sort((a, b) => b.position - a.position)
            .first();
        const isTopRole = highestRole && botMember.roles.highest.id === highestRole.id;
        const allPermissionFlags = Object.values(PermissionsBitField.Flags);
        const hasAllPerms = allPermissionFlags.every(flag => botMember.permissions.has(flag));

        if (!isTopRole || !hasAllPerms) {
            const reminderEmbed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'ProtonX' })
                .setTitle('Reminders')
                .setDescription(safeDescription('Make sure the **ProtonX** role is placed at the very top of your role hierarchy, above all other roles. Give ProtonX all permissions — Administrator is highly recommended so it can properly monitor, punish, and revert any nuke attempts without restrictions.\n\n**Once you\'ve fixed these, use `!xstatus` to check if everything\'s set.**'))
                .addFields(
                    { name: 'Role position', value: isTopRole ? '✓ At the top' : '✗ Not at the top', inline: false },
                    { name: 'All permissions', value: hasAllPerms ? '✓ Granted' : '✗ Missing', inline: false },
                )
                .setFooter(getFooter());

            message.channel.send({ embeds: [reminderEmbed] }).catch(() => {});
        }

        return;
    }

    if (command === 'anti-off') {
        if (!isOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the server owner can use this command.')] });
        }

        guildData.enabled = false;
        saveData(data);

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Protection Status' })
            .setThumbnail(client.user.displayAvatarURL())
            .setTitle('Anti-Nuke Disabled')
            .addFields(
                { name: 'Status', value: 'Off', inline: false },
            )
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'antibot-on') {
        if (!isOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the server owner can use this command.')] });
        }

        guildData.antiBot = true;
        saveData(data);

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Anti Bot & Webhook' })
            .setThumbnail(client.user.displayAvatarURL())
            .setTitle('Anti Bot & Webhook Enabled')
            .addFields(
                { name: 'Status', value: 'On — whitelisted users are also blocked from adding bots or creating webhooks.', inline: false },
            )
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'antibot-off') {
        if (!isOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the server owner can use this command.')] });
        }

        guildData.antiBot = false;
        saveData(data);

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Anti Bot & Webhook' })
            .setThumbnail(client.user.displayAvatarURL())
            .setTitle('Anti Bot & Webhook Disabled')
            .addFields(
                { name: 'Status', value: 'Off — users whitelisted with Full Access can now add bots and create webhooks.', inline: false },
            )
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'antilink-on') {
        if (!isOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the server owner can use this command.')] });
        }

        message.reply({
            embeds: [buildantilinkStatusEmbed(guildData.antiLink, 'Select a category to enable')],
            components: buildantilinkSelectComponents('antilink_on_select'),
        });
        return;
    }

    if (command === 'antilink-off') {
        if (!isOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the server owner can use this command.')] });
        }

        message.reply({
            embeds: [buildantilinkStatusEmbed(guildData.antiLink, 'Select a category to disable')],
            components: buildantilinkSelectComponents('antilink_off_select'),
        });
        return;
    }

    if (command === 'antilinkbypass') {
        if (!isOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the server owner can use this command.')] });
        }

        message.reply({
            embeds: [buildantilinkBypassEmbed(guildData.antiLink.bypassCategories)],
            components: buildantilinkBypassComponents(),
        });
        return;
    }

    if (command === 'antispam-on') {
        if (!isOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the server owner can use this command.')] });
        }

        message.reply({
            embeds: [buildAspamThresholdEmbed()],
            components: buildAspamThresholdComponents(),
        });
        return;
    }

    if (command === 'antispam-off') {
        if (!isOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the server owner can use this command.')] });
        }

        guildData.antiSpam.enabled = false;
        saveData(data);

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Anti-Spam' })
            .setThumbnail(client.user.displayAvatarURL())
            .setTitle('Anti-Spam Disabled')
            .addFields(
                { name: 'Status', value: 'Off', inline: false },
            )
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'whitelist') {
        if (!isOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the server owner can use this command.')] });
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply({ embeds: [simpleEmbed('Please mention a user to whitelist.')] });
        }

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Whitelist' })
            .setThumbnail(client.user.displayAvatarURL())
            .setTitle('Select Whitelist Permissions')
            .setDescription(safeDescription(`Select the permissions for **${target.user.tag}**\nYou can select multiple permissions.`))
            .setFooter(getFooter());

        const row = buildWhitelistSelectMenu(target.id);

        message.reply({ embeds: [embed], components: [row] });
        return;
    }

    if (command === 'unwhitelist') {
        if (!isOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the server owner can use this command.')] });
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply({ embeds: [simpleEmbed('Please mention a user to unwhitelist.')] });
        }

        const whitelistEntry = guildData.whitelist.find(w => w.id === target.id);
        if (!whitelistEntry) {
            return message.reply({ embeds: [simpleEmbed('This user is not in the whitelist.')] });
        }

        guildData.whitelist = guildData.whitelist.filter(w => w.id !== target.id);
        saveData(data);

        sendGlobalLog('whitelist', {
            header: 'Whitelist Change',
            title: 'User Unwhitelisted',
            lines: [
                `Server : ${message.guild.name} (${message.guild.id})`,
                `By : ${message.author.tag}`,
                `Target : ${target.user.tag}`,
            ],
            thumbnailURL: message.guild.iconURL({ size: 128 }),
        }, null, message.guild);

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Permission' })
            .setTitle('User Unwhitelisted')
            .addFields(
                { name: 'User', value: `${target.user.tag}`, inline: false },
                { name: 'Total Whitelisted', value: `${guildData.whitelist.length}`, inline: false },
            )
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'whitelistlist') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }

        if (guildData.whitelist.length === 0) {
            return message.reply({ embeds: [simpleEmbed('No users are whitelisted in this server.')] });
        }

        const lines = [];
        for (const entry of guildData.whitelist) {
            const user = await client.users.fetch(entry.id).catch(() => null);
            const tag = user ? user.tag : 'Unknown User';
            const permLabels = entry.permissions.map(p => `\`${getPermissionLabel(p).toLowerCase()}\``).join(' ');
            lines.push(`**${tag}**\nPermissions: ${permLabels}`);
        }

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Whitelist' })
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTitle('Whitelisted Users')
            .setDescription(safeDescription(lines.join('\n\n')))
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'bypass') {
        if (!isRealOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the actual server owner can use this command.')] });
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply({ embeds: [simpleEmbed('Please mention a user to bypass. Example: `!xbypass @user`\n\n**Warning:** be careful when using this the target will be able to use every owner-only command, including disabling anti-nuke and managing the whitelist.')] });
        }

        if (target.id === message.guild.ownerId) {
            return message.reply({ embeds: [simpleEmbed('This user is already the server owner.')] });
        }

        if (!guildData.bypass.includes(target.id)) {
            guildData.bypass.push(target.id);
            saveData(data);
        }

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Bypass' })
            .setThumbnail(client.user.displayAvatarURL())
            .setTitle('User Bypassed')
            .setDescription(safeDescription(`${target} can now use every owner-only command on this server, just like the server owner.\n\n**This is dangerous.** Only grant bypass to someone you fully trust they will be able to disable anti-nuke, manage the whitelist, and change server protection settings.`))
            .setFooter(getFooter());

        sendGlobalLog('whitelist', {
            header: 'Bypass Change',
            title: 'User Bypassed',
            lines: [
                `Server : ${message.guild.name} (${message.guild.id})`,
                `By : ${message.author.tag}`,
                `Target : ${target.user.tag}`,
            ],
            thumbnailURL: message.guild.iconURL({ size: 128 }),
        }, null, message.guild);

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'unbypass') {
        if (!isRealOwner) {
            return message.reply({ embeds: [simpleEmbed('Only the actual server owner can use this command.')] });
        }

        const target = message.mentions.members.first();
        if (!target) {
            return message.reply({ embeds: [simpleEmbed('Please mention a user to unbypass.')] });
        }

        if (!guildData.bypass.includes(target.id)) {
            return message.reply({ embeds: [simpleEmbed('This user does not have bypass.')] });
        }

        guildData.bypass = guildData.bypass.filter(id => id !== target.id);
        saveData(data);

        sendGlobalLog('whitelist', {
            header: 'Bypass Change',
            title: 'User Unbypassed',
            lines: [
                `Server : ${message.guild.name} (${message.guild.id})`,
                `By : ${message.author.tag}`,
                `Target : ${target.user.tag}`,
            ],
            thumbnailURL: message.guild.iconURL({ size: 128 }),
        }, null, message.guild);

        message.reply({ embeds: [simpleEmbed(`${target.user.tag} no longer has bypass.`)] });
        return;
    }

    if (command === 'bypasslist') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }

        if (guildData.bypass.length === 0) {
            return message.reply({ embeds: [simpleEmbed('No users have bypass on this server.')] });
        }

        const lines = [];
        for (const userId of guildData.bypass) {
            const user = await client.users.fetch(userId).catch(() => null);
            lines.push(user ? user.tag : `Unknown User (${userId})`);
        }

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Bypass' })
            .setThumbnail(message.guild.iconURL({ dynamic: true }))
            .setTitle('Bypassed Users')
            .setDescription(safeDescription(lines.join('\n')))
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'autorole') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }

        const subCommand = args[0];

        if (subCommand && subCommand.toLowerCase() === 'off') {
            guildData.autoRole = null;
            saveData(data);

            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Permission' })
                .setTitle('Auto Role Disabled')
                .setDescription(safeDescription('New members will no longer receive a role automatically.'))
                .setFooter(getFooter());

            return message.reply({ embeds: [embed] });
        }

        if (!subCommand) {
            return message.reply({ embeds: [simpleEmbed('Please provide a role. Example: `!xautorole @role`')] });
        }

        const roleMention = message.mentions.roles.first();
        let role;

        if (roleMention) {
            role = roleMention;
        } else {
            const roleQuery = args.join(' ');
            role = message.guild.roles.cache.find(r => r.name.toLowerCase() === roleQuery.toLowerCase())
                || message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleQuery.toLowerCase()))
                || message.guild.roles.cache.get(args[0]);
        }

        if (!role) {
            return message.reply({ embeds: [simpleEmbed(`No role found matching \`${args.join(' ')}\`. Please check the spelling or try mentioning the role.`)] });
        }

        const botMember = message.guild.members.me;
        if (!botMember.permissions.has('ManageRoles')) {
            return message.reply({ embeds: [simpleEmbed('I don\'t have the **Manage Roles** permission. Please grant it to me first.')] });
        }

        if (role.position >= botMember.roles.highest.position) {
            return message.reply({ embeds: [simpleEmbed(`I can't assign **${role.name}** because it's positioned higher than my highest role. Please move my role above it.`)] });
        }

        guildData.autoRole = role.id;
        saveData(data);

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Permission' })
            .setTitle('Auto Role Set')
            .setDescription(safeDescription(`New members will automatically receive ${role}.`))
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'emojis') {
        const emojis = message.guild.emojis.cache;
        if (emojis.size === 0) {
            return message.reply({ embeds: [simpleEmbed('This server has no custom emojis.')] });
        }

        const staticEmojis = emojis.filter(e => !e.animated);
        const animatedEmojis = emojis.filter(e => e.animated);

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Server Emojis' })
            .setTitle(`Total: ${emojis.size} | Static: ${staticEmojis.size} | Animated: ${animatedEmojis.size}`)
            .setFooter(getFooter());

        const descriptionChunks = [];
        let currentDesc = '';

        emojis.forEach(emoji => {
            const emojiDesc = `${emoji} \`:${emoji.name}:\`\n`;
            if ((currentDesc + emojiDesc).length > 1024) {
                descriptionChunks.push(currentDesc);
                currentDesc = emojiDesc;
            } else {
                currentDesc += emojiDesc;
            }
        });
        if (currentDesc) descriptionChunks.push(currentDesc);

        embed.setDescription(safeDescription(descriptionChunks[0], 'No emojis'));

        const embeds = [embed];
        for (let i = 1; i < descriptionChunks.length; i++) {
            const extraEmbed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setDescription(safeDescription(descriptionChunks[i]))
                .setFooter(getFooter());
            embeds.push(extraEmbed);
        }

        if (embeds.length === 1) {
            message.reply({ embeds: [embed] });
        } else {
            message.reply({ embeds: [embeds[0]] });
            for (let i = 1; i < embeds.length; i++) {
                message.channel.send({ embeds: [embeds[i]] });
            }
        }
        return;
    }

    if (command === 'stickers') {
        const stickers = message.guild.stickers.cache;
        if (stickers.size === 0) {
            return message.reply({ embeds: [simpleEmbed('This server has no stickers.')] });
        }

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Server Stickers' })
            .setTitle(`Total: ${stickers.size}`)
            .setFooter(getFooter());

        const stickerList = stickers.map(s => {
            return `**${s.name}**\n${s.url}`;
        }).join('\n\n');

        if (stickerList.length > 4096) {
            const chunks = [];
            let current = '';
            const lines = stickerList.split('\n\n');

            for (const line of lines) {
                if ((current + line + '\n\n').length > 4096) {
                    chunks.push(current);
                    current = line + '\n\n';
                } else {
                    current += line + '\n\n';
                }
            }
            if (current) chunks.push(current);

            embed.setDescription(safeDescription(chunks[0]));
            message.reply({ embeds: [embed] });

            for (let i = 1; i < chunks.length; i++) {
                const extraEmbed = new EmbedBuilder()
                    .setColor(DARK_GRAY)
                    .setDescription(safeDescription(chunks[i]))
                    .setFooter(getFooter());
                message.channel.send({ embeds: [extraEmbed] });
            }
        } else {
            embed.setDescription(safeDescription(stickerList));
            message.reply({ embeds: [embed] });
        }
        return;
    }

    if (command === 'logs') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('logs_category_select')
            .setPlaceholder('Select a log category')
            .addOptions(
                { label: 'Message', description: 'Logs deleted and edited messages', value: 'message' },
                { label: 'Profile', description: 'Logs username and avatar changes', value: 'profile' },
                { label: 'Voice', description: 'Logs voice channel joins and leaves', value: 'voice' },
                { label: 'Member', description: 'Logs server joins and leaves', value: 'member' },
            );

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Logs' })
            .setThumbnail(client.user.displayAvatarURL())
            .setTitle('Server Logs')
            .setDescription(safeDescription('Select a category below to configure logging.'))
            .setFooter(getFooter());

        message.reply({ embeds: [embed], components: [row] });
        return;
    }

    if (command === 'afk') {
        const reason = args.join(' ') || 'No reason';

        guildData.afk[message.author.id] = {
            reason: reason,
            timestamp: Date.now(),
        };
        saveData(data);

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'AFK' })
            .setTitle('Set AFK')
            .setThumbnail(message.author.displayAvatarURL())
            .addFields(
                { name: 'User', value: `${message.author.tag}`, inline: false },
                { name: 'Reason', value: reason, inline: false },
            )
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'afklist') {
        const afkEntries = Object.entries(guildData.afk);
        if (afkEntries.length === 0) {
            return message.reply({ embeds: [simpleEmbed('No users are currently AFK.')] });
        }

        const fields = [];
        for (const [userId, afkInfo] of afkEntries) {
            const user = await client.users.fetch(userId).catch(() => null);
            const tag = user ? user.tag : 'Unknown User';
            const duration = formatDuration(Date.now() - afkInfo.timestamp);
            fields.push({
                name: tag,
                value: `**Reason:** ${afkInfo.reason}\n**Duration:** ${duration}`,
                inline: false,
            });
        }

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'AFK' })
            .setTitle('AFK List')
            .setThumbnail(client.user.displayAvatarURL())
            .addFields(fields)
            .setFooter(getFooter());

        message.reply({ embeds: [embed] });
        return;
    }

    if (command === 'leave') {
        if (!BOT_OWNER_IDS.includes(message.author.id)) return;

        await message.delete().catch(() => {});

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Leaving' })
            .setTitle('Goodbye!')
            .setDescription(safeDescription(`Leaving **${message.guild.name}**...`))
            .setFooter(getFooter());

        const reply = await message.channel.send({ embeds: [embed] });

        setTimeout(async () => {
            try {
                await message.guild.leave();
            } catch (err) {
                console.log(`Failed to leave guild: ${err.message}`);
            }
        }, 1000);

        setTimeout(() => reply.delete().catch(() => {}), 5000);
        return;
    }

    if (command === 'add') {
        if (!BOT_OWNER_IDS.includes(message.author.id)) return;

        await message.delete().catch(() => {});

        const target = message.mentions.members.first()
            || message.guild.members.cache.get(args[0])
            || message.guild.members.cache.find(m =>
                m.user.username.toLowerCase() === args[0]?.toLowerCase()
                || m.displayName.toLowerCase() === args[0]?.toLowerCase()
            );

        if (!target) {
            const errorMsg = await message.channel.send({ embeds: [simpleEmbed('User not found. Usage: `!xadd @user <role>`')] });
            setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
            return;
        }

        let roleQuery;
        if (message.mentions.users.size > 0) {
            roleQuery = args.slice(1).join(' ');
        } else {
            roleQuery = args.slice(1).join(' ');
        }

        if (!roleQuery) {
            const errorMsg = await message.channel.send({ embeds: [simpleEmbed('Please provide a role. Usage: `!xadd @user <role>`')] });
            setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
            return;
        }

        const roleMention = message.mentions.roles.first();
        let role;
        if (roleMention) {
            role = roleMention;
        } else {
            role = message.guild.roles.cache.get(roleQuery)
                || message.guild.roles.cache.find(r => r.name.toLowerCase() === roleQuery.toLowerCase())
                || message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleQuery.toLowerCase()));
        }

        if (!role) {
            const errorMsg = await message.channel.send({ embeds: [simpleEmbed(`No role found matching \`${roleQuery}\`.`)] });
            setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
            return;
        }

        if (target.roles.cache.has(role.id)) {
            const errorMsg = await message.channel.send({ embeds: [simpleEmbed(`${target.user.tag} already has ${role.name}.`)] });
            setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
            return;
        }

        try {
            await target.roles.add(role);
        } catch (err) {
            const errorMsg = await message.channel.send({ embeds: [simpleEmbed(`Failed to add role: ${err.message}`)] });
            setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Secret Command' })
            .setTitle('Role Added')
            .addFields(
                { name: 'User', value: `${target.user.tag}`, inline: false },
                { name: 'Role', value: `${role.name}`, inline: false },
            )
            .setFooter(getFooter());

        const reply = await message.channel.send({ embeds: [embed] });
        setTimeout(() => reply.delete().catch(() => {}), 5000);
        return;
    }

    if (command === 'wipe') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }

        const amount = parseInt(args[0], 10);
        if (isNaN(amount) || amount < 1) {
            return message.reply({ embeds: [simpleEmbed('Please provide a valid number of messages to delete.')] });
        }

        const clampedAmount = Math.min(amount, 100);

        await message.delete().catch(() => {});

        let deletedCount = 0;
        try {
            if (clampedAmount === 1) {
                const recent = await message.channel.messages.fetch({ limit: 1 });
                const toDelete = recent.first();
                if (toDelete) {
                    await toDelete.delete();
                    deletedCount = 1;
                }
            } else {
                const deleted = await message.channel.bulkDelete(clampedAmount, true);
                deletedCount = deleted.size;
            }
        } catch (err) {
            console.log(`Failed to wipe messages: ${err.message}`);
            const failMsg = await message.channel.send({ embeds: [simpleEmbed('Failed to delete messages. Messages older than 14 days can\'t be bulk deleted.')] });
            setTimeout(() => failMsg.delete().catch(() => {}), 5000);
            return;
        }

        const embed = new EmbedBuilder()
            .setColor(DARK_GRAY)
            .setAuthor({ name: 'Wipe' })
            .setTitle('Messages Deleted')
            .addFields(
                { name: 'Amount', value: `${deletedCount}`, inline: true },
                { name: 'Channel', value: `${message.channel}`, inline: true },
            )
            .setFooter(getFooter());

        const confirmMsg = await message.channel.send({ embeds: [embed] });
        setTimeout(() => confirmMsg.delete().catch(() => {}), 5000);
        return;
    }

    if (command === 'setprefix') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }

        const newPrefix = args[0];
        if (!newPrefix) {
            return message.reply({ embeds: [simpleEmbed('Please provide a prefix. Example: `!xsetprefix ?`')] });
        }

        const result = applySetPrefix(guildData, newPrefix);
        if (!result.ok) {
            return message.reply({ embeds: [simpleEmbed(result.error)] });
        }

        return message.reply({ embeds: [buildPrefixEmbed('Prefix Updated', guildData)] });
    }

    if (command === 'resetprefix') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }

        guildData.prefix = null;
        saveData(data);

        return message.reply({ embeds: [buildPrefixEmbed('Prefix Reset', guildData)] });
    }

    if (command === 'setembedcolor') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();

        const hexInput = args[0];
        if (!hexInput) {
            return message.reply({ embeds: [simpleEmbed('Please provide a hex color. Example: `!xsetembedcolor #ff0000`')] });
        }

        const parsed = parseHexColor(hexInput);
        if (parsed === null) {
            return message.reply({ embeds: [simpleEmbed(`\`${hexInput}\` is not a valid hex color. Try formats like \`#ff0000\`, \`ff0000\`, or \`f00\`.`)] });
        }

        guildData.embedColor = parsed;
        saveData(data);

        return message.reply({ embeds: [buildEmbedColorEmbed(guildData)] });
    }

    if (command === 'setembed') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();

        guildData.embedDraft = defaultEmbedDraft();
        saveData(data);

        return message.reply({ embeds: [buildEmbedDraftStatusEmbed(guildData, 'New Embed Draft Started')] });
    }

    if (command === 'setauthor') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();
        if (!ensureDraft(guildData)) {
            return message.reply({ embeds: [simpleEmbed('Start a draft first with `!xsetembed`.')] });
        }

        const text = args.join(' ');
        if (!text) {
            return message.reply({ embeds: [simpleEmbed('Please provide the author text. Example: `!xsetauthor ProtonX Announcement`')] });
        }

        guildData.embedDraft.author = text.slice(0, 256);
        saveData(data);

        return message.reply({ embeds: [buildEmbedDraftStatusEmbed(guildData, 'Author Set')] });
    }

    if (command === 'setmessage') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();
        if (!ensureDraft(guildData)) {
            return message.reply({ embeds: [simpleEmbed('Start a draft first with `!xsetembed`.')] });
        }

        const text = args.join(' ');
        if (!text) {
            return message.reply({ embeds: [simpleEmbed('Please provide the message text. Example: `!xsetmessage Welcome to our server!`')] });
        }

        guildData.embedDraft.description = text.slice(0, 4096);
        saveData(data);

        return message.reply({ embeds: [buildEmbedDraftStatusEmbed(guildData, 'Message Set')] });
    }

    if (command === 'setfooter') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();
        if (!ensureDraft(guildData)) {
            return message.reply({ embeds: [simpleEmbed('Start a draft first with `!xsetembed`.')] });
        }

        const text = args.join(' ');
        if (!text) {
            return message.reply({ embeds: [simpleEmbed('Please provide the footer text. Example: `!xsetfooter Sent by ProtonX`')] });
        }

        guildData.embedDraft.footer = text.slice(0, 2048);
        saveData(data);

        return message.reply({ embeds: [buildEmbedDraftStatusEmbed(guildData, 'Footer Set')] });
    }

    if (command === 'setthumbnail') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();
        if (!ensureDraft(guildData)) {
            return message.reply({ embeds: [simpleEmbed('Start a draft first with `!xsetembed`.')] });
        }

        const url = args[0] || message.attachments.first()?.url;
        if (!url || !isValidImageUrl(url)) {
            return message.reply({ embeds: [simpleEmbed('Please provide a valid image URL or attach an image. Example: `!xsetthumbnail https://example.com/big-image.png`')] });
        }

        guildData.embedDraft.image = url;
        saveData(data);

        return message.reply({ embeds: [buildEmbedDraftStatusEmbed(guildData, 'Big Image (Bottom) Set')] });
    }

    if (command === 'setimage') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();
        if (!ensureDraft(guildData)) {
            return message.reply({ embeds: [simpleEmbed('Start a draft first with `!xsetembed`.')] });
        }

        const url = args[0] || message.attachments.first()?.url;
        if (!url || !isValidImageUrl(url)) {
            return message.reply({ embeds: [simpleEmbed('Please provide a valid image URL or attach an image. Example: `!xsetimage https://example.com/small-image.png`')] });
        }

        guildData.embedDraft.thumbnail = url;
        saveData(data);

        return message.reply({ embeds: [buildEmbedDraftStatusEmbed(guildData, 'Small Image (Top Right) Set')] });
    }

    if (command === 'setembedchannel') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();
        if (!ensureDraft(guildData)) {
            return message.reply({ embeds: [simpleEmbed('Start a draft first with `!xsetembed`.')] });
        }

        const channel = message.mentions.channels.first();
        if (!channel) {
            return message.reply({ embeds: [simpleEmbed('Please mention a channel. Example: `!xsetembedchannel #announcements`')] });
        }

        guildData.embedDraft.channelId = channel.id;
        saveData(data);

        return message.reply({ embeds: [buildEmbedDraftStatusEmbed(guildData, 'Send Channel Set')] });
    }

    if (command === 'sentembed' || command === 'sendembed') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();
        if (!ensureDraft(guildData)) {
            return message.reply({ embeds: [simpleEmbed('Start a draft first with `!xsetembed`.')] });
        }

        const draft = guildData.embedDraft;
        if (!draft.author || !draft.description || !draft.footer) {
            return message.reply({ embeds: [simpleEmbed('Your draft needs an author, a message, and a footer before it can be sent. Use `!xsetauthor`, `!xsetmessage`, and `!xsetfooter`.')] });
        }

        const mentionedChannels = [...message.mentions.channels.values()];

        if (mentionedChannels.length > 0) {
            const resultEmbed = await sendDraftToChannels(message.guild, draft, mentionedChannels);
            return message.reply({ embeds: [resultEmbed] });
        }

        return message.reply({
            embeds: [simpleEmbed('Pick one or more channels to send the embed to.')],
            components: buildSentEmbedChannelSelectComponents(),
        });
    }

    if (command === 'resetembed') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();

        guildData.embedDraft = null;
        saveData(data);

        return message.reply({ embeds: [simpleEmbed('Embed draft cleared.')] });
    }

    if (command === 'setprofile') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();

        const url = args[0] || message.attachments.first()?.url;
        if (!url || !isValidImageUrl(url)) {
            return message.reply({ embeds: [simpleEmbed('Please provide a valid image URL or attach an image.')] });
        }

        const result = await setPerServerProfile(message.guild, 'avatar', url);
        if (!result.ok) {
            return message.reply({ embeds: [simpleEmbed(result.error)] });
        }

        guildData.perServerProfile.avatar = url;
        saveData(data);

        return message.reply({ embeds: [simpleEmbed('Per-server bot avatar updated for this server.')] });
    }

    if (command === 'setbanner') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();

        const url = args[0] || message.attachments.first()?.url;
        if (!url || !isValidImageUrl(url)) {
            return message.reply({ embeds: [simpleEmbed('Please provide a valid image URL or attach an image.')] });
        }

        const result = await setPerServerProfile(message.guild, 'banner', url);
        if (!result.ok) {
            return message.reply({ embeds: [simpleEmbed(result.error)] });
        }

        guildData.perServerProfile.banner = url;
        saveData(data);

        return message.reply({ embeds: [simpleEmbed('Per-server bot banner updated for this server.')] });
    }

    if (command === 'resetprofile') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();

        await resetPerServerProfile(message.guild, 'avatar');
        guildData.perServerProfile.avatar = null;
        saveData(data);

        return message.reply({ embeds: [simpleEmbed('Per-server bot avatar reset to the global default. Are you sure? This has been confirmed and applied.')] });
    }

    if (command === 'resetbanner') {
        if (!isAllowed) {
            return message.reply({ embeds: [simpleEmbed('Only the owner or whitelisted users can use this command.')] });
        }
        if (!isPremium(guildData)) return premiumOnly();

        await resetPerServerProfile(message.guild, 'banner');
        guildData.perServerProfile.banner = null;
        saveData(data);

        return message.reply({ embeds: [simpleEmbed('Per-server bot banner reset to the global default. Are you sure? This has been confirmed and applied.')] });
    }

    if (command === 'premium-add') {
        if (!BOT_OWNER_IDS.includes(message.author.id)) return botOwnerOnly();

        const serverId = args[0];
        if (!serverId) {
            return message.reply({ embeds: [simpleEmbed('Please provide a server ID. Example: `!xpremium-add 123456789012345678`')] });
        }

        const targetGuildData = getGuildData(serverId);
        targetGuildData.premium = true;
        saveData(data);

        const targetGuild = client.guilds.cache.get(serverId);
        return message.reply({ embeds: [simpleEmbed(`Premium granted to \`${serverId}\`${targetGuild ? ` (${targetGuild.name})` : ''}.`)] });
    }

    if (command === 'premium-remove' || command === 'premium-removed') {
        if (!BOT_OWNER_IDS.includes(message.author.id)) return botOwnerOnly();

        const serverId = args[0];
        if (!serverId) {
            return message.reply({ embeds: [simpleEmbed('Please provide a server ID. Example: `!xpremium-remove 123456789012345678`')] });
        }

        const targetGuildData = getGuildData(serverId);
        targetGuildData.premium = false;
        saveData(data);

        const targetGuild = client.guilds.cache.get(serverId);
        return message.reply({ embeds: [simpleEmbed(`Premium removed from \`${serverId}\`${targetGuild ? ` (${targetGuild.name})` : ''}.`)] });
    }

    if (command === 'premiumlist') {
        if (!BOT_OWNER_IDS.includes(message.author.id)) return botOwnerOnly();

        return message.reply({ embeds: [buildPremiumListEmbed()] });
    }

    if (command === 'announce') {
        if (!BOT_OWNER_IDS.includes(message.author.id)) return;

        const announceMessage = args.join(' ');
        if (!announceMessage) {
            return message.reply({ embeds: [simpleEmbed('Please provide an announcement message.')] });
        }

        const uniqueOwners = new Map();

        for (const guild of client.guilds.cache.values()) {
            const owner = await guild.fetchOwner().catch(() => null);
            if (owner && !uniqueOwners.has(owner.id)) {
                uniqueOwners.set(owner.id, {
                    owner,
                    guilds: [guild]
                });
            } else if (owner) {
                uniqueOwners.get(owner.id).guilds.push(guild);
            }
        }

        const ownerArray = Array.from(uniqueOwners.values());
        const totalServers = client.guilds.cache.size;

        let currentPage = 0;
        const pageSize = 20;
        const totalPages = Math.ceil(ownerArray.length / pageSize);

        function getPageOwners(page) {
            return ownerArray.slice(page * pageSize, (page + 1) * pageSize);
        }

        function buildOwnerEmbed(page) {
            const embed = new EmbedBuilder()
                .setColor(DARK_GRAY)
                .setAuthor({ name: 'Update' })
                .setTitle('Select Owners')
                .setDescription(safeDescription(`Message: ${announceMessage}\n\nPage ${page + 1}/${totalPages}\nTotal Owners: ${ownerArray.length}`))
                .setFooter(getFooter());

            getPageOwners(page).forEach(({ owner, guilds }, index) => {
                embed.addFields({
                    name: `${index + 1}. ${owner.user.tag}`,
                    value: `${guilds.length} server(s)`,
                    inline: false,
                });
            });

            return embed;
        }

        function buildOwnerComponents(page) {
            const pageOwners = getPageOwners(page);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('announce_owner_select')
                .setPlaceholder('Select owners to send announcement')
                .setMinValues(1)
                .setMaxValues(Math.min(pageOwners.length, 20))
                .addOptions(
                    pageOwners.map(({ owner, guilds }, index) => ({
                        label: owner.user.tag.slice(0, 100),
                        value: owner.id,
                        description: `${guilds.length} server(s): ${guilds.map(g => g.name).join(', ').slice(0, 100)}`,
                    }))
                );

            const prevButton = new ButtonBuilder()
                .setCustomId('announce_prev')
                .setLabel('Previous')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === 0);

            const nextButton = new ButtonBuilder()
                .setCustomId('announce_next')
                .setLabel('Next')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page === totalPages - 1);

            const sendAllButton = new ButtonBuilder()
                .setCustomId('announce_send_all')
                .setLabel('Send to All')
                .setStyle(ButtonStyle.Danger);

            const row1 = new ActionRowBuilder().addComponents(selectMenu);
            const row2 = new ActionRowBuilder().addComponents(prevButton, nextButton, sendAllButton);

            return [row1, row2];
        }

        const reply = await message.reply({
            embeds: [buildOwnerEmbed(currentPage)],
            components: buildOwnerComponents(currentPage)
        });

        const filter = i => i.user.id === message.author.id;

        while (true) {
            let interaction;
            try {
                interaction = await reply.awaitMessageComponent({ filter, time: 120000 });
            } catch (err) {
                return reply.edit({ embeds: [simpleEmbed('Timed out. Please try again.')], components: [] });
            }

            if (interaction.isButton()) {
                if (interaction.customId === 'announce_prev') {
                    currentPage--;
                    await interaction.update({
                        embeds: [buildOwnerEmbed(currentPage)],
                        components: buildOwnerComponents(currentPage)
                    });
                    continue;
                }

                if (interaction.customId === 'announce_next') {
                    currentPage++;
                    await interaction.update({
                        embeds: [buildOwnerEmbed(currentPage)],
                        components: buildOwnerComponents(currentPage)
                    });
                    continue;
                }

                if (interaction.customId === 'announce_send_all') {
                    const announcementEmbed = new EmbedBuilder()
                        .setColor(DARK_GRAY)
                        .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                        .setThumbnail(client.user.displayAvatarURL())
                        .setTitle('New Update Added')
                        .setDescription(safeDescription(announceMessage))
                        .setFooter(getFooter());

                    const statusEmbed = new EmbedBuilder()
                        .setColor(DARK_GRAY)
                        .setAuthor({ name: 'Update' })
                        .setTitle('Sending Announcement...')
                        .setDescription(safeDescription(`Sending to all ${ownerArray.length} owners...`))
                        .setFooter(getFooter());

                    await interaction.update({ embeds: [statusEmbed], components: [] });

                    let sent = 0;
                    let failed = 0;
                    let serversSent = 0;
                    const sentTo = [];
                    const failedTo = [];

                    for (const { owner, guilds } of ownerArray) {
                        const guildNames = guilds.map(g => g.name).join(', ');

                        try {
                            await owner.send({ embeds: [announcementEmbed] });
                            sent++;
                            serversSent += guilds.length;
                            sentTo.push(`${owner.user.tag} (${guildNames})`);
                        } catch (err) {
                            failed++;
                            failedTo.push(`${owner.user.tag} (${guildNames})`);
                            console.log(`Failed to DM ${owner.user.tag}: ${err.message}`);
                        }

                        const progressEmbed = new EmbedBuilder()
                            .setColor(DARK_GRAY)
                            .setAuthor({ name: 'Update' })
                            .setTitle('Sending Announcement...')
                            .setDescription(safeDescription(`**Sending to:** ${owner.user.tag}\n\n**Progress:** ${serversSent}/${totalServers} servers`))
                            .setFooter(getFooter());

                        await interaction.editReply({ embeds: [progressEmbed], components: [] }).catch(() => {});

                        await new Promise(resolve => setTimeout(resolve, 7000));
                    }

                    const resultEmbed = new EmbedBuilder()
                        .setColor(DARK_GRAY)
                        .setAuthor({ name: 'Update' })
                        .setTitle('Announcement Complete')
                        .addFields(
                            { name: 'Delivered', value: `${sent}`, inline: true },
                            { name: 'Failed', value: `${failed}`, inline: true },
                            { name: 'Total', value: `${ownerArray.length}`, inline: true },
                            { name: 'Sent To', value: sentTo.length > 0 ? sentTo.join('\n').slice(0, 1024) : 'No one', inline: false },
                            { name: 'Failed To', value: failedTo.length > 0 ? failedTo.join('\n').slice(0, 1024) : 'None', inline: false },
                        )
                        .setFooter(getFooter());

                    await interaction.editReply({ embeds: [resultEmbed], components: [] });
                    return;
                }
            }

            if (interaction.isStringSelectMenu() && interaction.customId === 'announce_owner_select') {
                const selectedOwnerIds = interaction.values;

                const announcementEmbed = new EmbedBuilder()
                    .setColor(DARK_GRAY)
                    .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
                    .setThumbnail(client.user.displayAvatarURL())
                    .setTitle('New Update Added')
                    .setDescription(safeDescription(announceMessage))
                    .setFooter(getFooter());

                const statusEmbed = new EmbedBuilder()
                    .setColor(DARK_GRAY)
                    .setAuthor({ name: 'Update' })
                    .setTitle('Sending Announcement...')
                    .setDescription(safeDescription(`Sending to ${selectedOwnerIds.length} owners...`))
                    .setFooter(getFooter());

                await interaction.update({ embeds: [statusEmbed], components: [] });

                let sent = 0;
                let failed = 0;
                let serversSent = 0;
                const sentTo = [];
                const failedTo = [];

                let totalSelectedServers = 0;
                for (const ownerId of selectedOwnerIds) {
                    const ownerData = uniqueOwners.get(ownerId);
                    if (ownerData) totalSelectedServers += ownerData.guilds.length;
                }

                for (const ownerId of selectedOwnerIds) {
                    const ownerData = uniqueOwners.get(ownerId);
                    if (!ownerData) {
                        failed++;
                        failedTo.push(`Unknown (${ownerId})`);
                        continue;
                    }

                    const { owner, guilds } = ownerData;
                    const guildNames = guilds.map(g => g.name).join(', ');

                    try {
                        await owner.send({ embeds: [announcementEmbed] });
                        sent++;
                        serversSent += guilds.length;
                        sentTo.push(`${owner.user.tag} (${guildNames})`);
                    } catch (err) {
                        failed++;
                        failedTo.push(`${owner.user.tag} (${guildNames})`);
                        console.log(`Failed to DM ${owner.user.tag}: ${err.message}`);
                    }

                    const progressEmbed = new EmbedBuilder()
                        .setColor(DARK_GRAY)
                        .setAuthor({ name: 'Update' })
                        .setTitle('Sending Announcement...')
                        .setDescription(safeDescription(`**Sending to:** ${owner.user.tag}\n\n**Progress:** ${serversSent}/${totalSelectedServers} servers`))
                        .setFooter(getFooter());

                    await interaction.editReply({ embeds: [progressEmbed], components: [] }).catch(() => {});

                    await new Promise(resolve => setTimeout(resolve, 7000));
                }

                const resultEmbed = new EmbedBuilder()
                    .setColor(DARK_GRAY)
                    .setAuthor({ name: 'Update' })
                    .setTitle('Announcement Complete')
                    .addFields(
                        { name: 'Delivered', value: `${sent}`, inline: true },
                        { name: 'Failed', value: `${failed}`, inline: true },
                        { name: 'Total', value: `${selectedOwnerIds.length}`, inline: true },
                        { name: 'Sent To', value: sentTo.length > 0 ? sentTo.join('\n').slice(0, 1024) : 'No one', inline: false },
                        { name: 'Failed To', value: failedTo.length > 0 ? failedTo.join('\n').slice(0, 1024) : 'None', inline: false },
                    )
                    .setFooter(getFooter());

                await interaction.editReply({ embeds: [resultEmbed], components: [] });
                return;
            }
        }
    }
});

process.on('unhandledRejection', (reason) => {
    console.log(`Unhandled Rejection: ${reason}`);
    if (!client.user) return;
    sendGlobalLog('errors', {
        header: 'Error Log',
        title: 'Unhandled Rejection',
        lines: [`\`\`\`${String(reason).slice(0, 1900)}\`\`\``],
    });
});

process.on('uncaughtException', (err) => {
    console.log(`Uncaught Exception: ${err.message}`);
    if (!client.user) return;
    sendGlobalLog('errors', {
        header: 'Error Log',
        title: 'Uncaught Exception',
        lines: [`\`\`\`${String(err.stack || err.message).slice(0, 1900)}\`\`\``],
    });
});

app.listen(process.env.PORT || 8080, () => {
    console.log('Member API running');
});

client.login(process.env.DISCORD_TOKEN);
