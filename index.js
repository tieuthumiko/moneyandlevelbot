require('dotenv').config();
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
    user: String,
    guild: String,
    xp: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    money: { type: Number, default: 0 },
    lastDaily: { type: Number, default: 0 }
});
const User = mongoose.model("User", UserSchema);

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;
const OWNER_ID = process.env.OWNER_ID;
const PREFIX = process.env.PREFIX || "mi!";

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

mongoose.connect(MONGO_URI)
    .then(() => console.log("MongoDB connected!"))
    .catch(console.error);

client.once("clientReady", () => console.log(`Logged in as ${client.user.tag}`));

const cooldowns = new Map();
function canGain(key) {
    const now = Date.now();
    const cooldownAmount = 60 * 1000;
    if (cooldowns.has(key)) {
        const expirationTime = cooldowns.get(key) + cooldownAmount;
        if (now < expirationTime) return false;
    }
    cooldowns.set(key, now);
    return true;
}

function getXP() { return Math.floor(Math.random() * 10) + 5; }
function getMicoin() { return Math.floor(Math.random() * 20) + 5; }

function getMoneyTier(amount) {
    if (amount >= 5000) return "Platinum";
    if (amount >= 1000) return "Gold";
    if (amount >= 500) return "Silver";
    return "Bronze";
}

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    const key = message.author.id + message.guild.id;

    if (!message.content.startsWith(PREFIX)) {
        if (!canGain(key)) return;

        let data = await User.findOne({ user: message.author.id, guild: message.guild.id });
        if (!data) data = await User.create({ user: message.author.id, guild: message.guild.id });

        data.xp += getXP();
        data.money += getMicoin();
        let xpNeeded = data.level * 100;

        if (data.xp >= xpNeeded) {
            data.level += 1;
            data.xp -= xpNeeded;
            message.channel.send(`${message.author} vừa lên level **${data.level}**! 🎉`);

            if (data.level >= 100) {
                let role = message.guild.roles.cache.find(r => r.name === "Level 100 VIP");
                if (!role) {
                    role = await message.guild.roles.create({
                        name: "Level 100 VIP",
                        color: "Gold",
                        permissions: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles]
                    });
                }
                if (!message.member.roles.cache.has(role.id)) {
                    await message.member.roles.add(role);
                    message.channel.send(`${message.author} đã nhận role **Level 100 VIP**! 🏅`);
                }
            }
        }

        await data.save();
        return;
    }

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args[0].toLowerCase();

    let data = await User.findOne({ user: message.author.id, guild: message.guild.id });
    if (!data) data = await User.create({ user: message.author.id, guild: message.guild.id });

    if (cmd === "level") {
        message.channel.send(`${message.author} đang ở level **${data.level}** với **${data.xp} XP**.`);
    }

    if (cmd === "money") {
        message.channel.send(`${message.author} hiện có **${data.money} micoin** 💰 (${getMoneyTier(data.money)})`);
    }

    if (cmd === "daily") {
        const now = Date.now();
        if (now - data.lastDaily < 24*60*60*1000) {
            const remain = Math.ceil((24*60*60*1000 - (now - data.lastDaily))/3600000);
            return message.reply(`Bạn đã nhận daily rồi! Hãy chờ ${remain} giờ nữa.`);
        }
        const dailyAmount = 100;
        data.money += dailyAmount;
        data.lastDaily = now;
        await data.save();
        message.channel.send(`${message.author} nhận **${dailyAmount} micoin** từ daily! 💰 (${getMoneyTier(data.money)})`);
    }

    if (cmd === "give") {
        const user = message.mentions.users.first();
        let amount = parseInt(args[2]);
        if (!user || isNaN(amount)) return message.reply(`Cú pháp: ${PREFIX}give @user amount`);

        let dataUser = await User.findOne({ user: user.id, guild: message.guild.id });
        if (!dataUser) dataUser = await User.create({ user: user.id, guild: message.guild.id });

        if (message.author.id !== OWNER_ID) {
            if (amount > data.money) return message.reply("Bạn không đủ micoin!");
        }

        data.money -= (message.author.id === OWNER_ID ? 0 : amount);
        dataUser.money += amount;

        await data.save();
        await dataUser.save();

        message.channel.send(`${message.author} đã trao **${amount} micoin** cho ${user} 💰 (${getMoneyTier(dataUser.money)})`);
    }

    if (cmd === "profile") {
        let target = message.mentions.users.first() || message.author;
        let dataUser = await User.findOne({ user: target.id, guild: message.guild.id });
        if (!dataUser) dataUser = await User.create({ user: target.id, guild: message.guild.id });

        let displayLevel = target.id === OWNER_ID ? "?" : dataUser.level;
        let displayMoney = target.id === OWNER_ID ? "?" : dataUser.money;
        let displayTier = target.id === OWNER_ID ? "Miko Tier" : getMoneyTier(dataUser.money);

        const embed = new EmbedBuilder()
            .setTitle(`${target.username} | Profile`)
            .setColor("Blue")
            .addFields(
                { name: "Level", value: `${displayLevel}`, inline: true },
                { name: "Micoin", value: `${displayMoney} (${displayTier})`, inline: true }
            )
            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: `Requested by ${message.author.username}` })
            .setTimestamp();

        message.channel.send({ embeds: [embed] });
    }

    if (cmd === "givelv") {
        if (message.author.id !== OWNER_ID) return message.reply("Chỉ owner bot mới dùng được lệnh này!");
        const user = message.mentions.users.first();
        const amount = parseInt(args[2]);
        if (!user || isNaN(amount)) return message.reply(`Cú pháp: ${PREFIX}givelv @user amount`);

        let dataUser = await User.findOne({ user: user.id, guild: message.guild.id });
        if (!dataUser) dataUser = await User.create({ user: user.id, guild: message.guild.id });

        dataUser.level += amount;

        if (dataUser.level >= 100) {
            let role = message.guild.roles.cache.find(r => r.name === "Level 100 VIP");
            if (!role) {
                role = await message.guild.roles.create({
                    name: "Level 100 VIP",
                    color: "Gold",
                    permissions: [PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.AttachFiles]
                });
            }
            const member = await message.guild.members.fetch(user.id);
            if (!member.roles.cache.has(role.id)) {
                await member.roles.add(role);
            }
        }

        await dataUser.save();
        message.channel.send(`${user} đã được cộng **${amount} level**! Hiện tại level: ${dataUser.level}`);
    }
});

client.login(BOT_TOKEN);