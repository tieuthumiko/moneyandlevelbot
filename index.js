require('dotenv').config();
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is running! :3');
});

app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");

const GlobalSchema=new mongoose.Schema({

user:String,

money:{
type:Number,
default:0
},

micash:{
type:Number,
default:0
},

lastDaily:{
type:Number,
default:0
}

});

const Global = mongoose.model("Global",GlobalSchema);

const ServerSchema=new mongoose.Schema({

user:String,

guild:String,

xp:{
type:Number,
default:0
},

level:{
type:Number,
default:1
}

});

const Level = mongoose.model("Level",ServerSchema);

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

setTimeout(()=>{
cooldowns.delete(key);
},cooldownAmount);
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

async function getGlobal(id){

let data=
await Global.findOne({
user:id
}).lean();

if(!data){

data=
await Global.create({
user:id
});

return data;

}

if(data.money==null || data.micash==null){

await Global.updateOne(
{user:id},
{
$set:{
money:data.money||0,
micash:data.micash||0
}
}
);

data=
await Global.findOne({
user:id
});

}

return data;

}

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if(!message.guild) return;

    const key = message.author.id + message.guild.id;

    if (!message.content.startsWith(PREFIX)) {

if (!canGain(key)) return;

let levelData =
await Level.findOne({
user:message.author.id,
guild:message.guild.id
});

if(!levelData)
levelData =
await Level.create({
user:message.author.id,
guild:message.guild.id
});

let globalData =
await getGlobal({
user:message.author.id
});

if(!globalData)
globalData =
await Global.create({
user:message.author.id
});

levelData.xp += getXP();

globalData.money += getMicoin();

let xpNeeded =
levelData.level*100;

if(levelData.xp >= xpNeeded){

levelData.level++;

levelData.xp -= xpNeeded;

message.channel.send(
`${message.author} vừa lên level **${levelData.level}** 🎉`
);

if(levelData.level>=100){

let role =
message.guild.roles.cache.find(
r=>r.name==="Level 100 VIP"
);

if(!role){

role=
await message.guild.roles.create({

name:"Level 100 VIP",

color:"Gold",

permissions:[
PermissionsBitField.Flags.SendMessages,
PermissionsBitField.Flags.AttachFiles
]

});

}

if(!message.member.roles.cache.has(role.id)){

await message.member.roles.add(role);

message.channel.send(
`${message.author} đã nhận role **Level 100 VIP** 🏅`
);

}

}

}

await levelData.save();

await globalData.save();

return;

}

    const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = args[0].toLowerCase();


    if (cmd === "level") {

let levelData =
await Level.findOne({
user:message.author.id,
guild:message.guild.id
});

if(!levelData)
levelData =
await Level.create({
user:message.author.id,
guild:message.guild.id
});

message.channel.send(
`${message.author} đang ở level **${levelData.level}** với **${levelData.xp} XP**.`
);

}

    if(cmd==="money"){

let globalData =
await getGlobal({
user:message.author.id
});

if(!globalData)
globalData=
await Global.create({
user:message.author.id
});

message.channel.send(
`${message.author} hiện có **${globalData.money} micoin** 💰 (${getMoneyTier(globalData.money)})`
);

}

    if(cmd==="daily"){

let globalData =
await getGlobal({
user:message.author.id
});

if(!globalData)
globalData=
await Global.create({
user:message.author.id
});

const now=Date.now();

if(now-globalData.lastDaily<86400000){

let remain=
Math.ceil(
(86400000-(now-globalData.lastDaily))/3600000
);

return message.reply(
`Chờ ${remain} giờ nữa`
);

}

let dailyAmount=100;

globalData.money+=dailyAmount;

globalData.lastDaily=now;

await globalData.save();

message.channel.send(
`${message.author} nhận ${dailyAmount} micoin 💰`
);

}

    if(cmd==="give"){

let user=
message.mentions.users.first();

let type=args[2];
let amount=parseInt(args[3]);

if(!user||!type||isNaN(amount))
return message.reply(
"mi!give @user money/cash/level amount"
);

if(message.author.id===OWNER_ID){

if(type==="level"){

let levelData=
await Level.findOne({
user:user.id,
guild:message.guild.id
});

if(!levelData)
levelData=
await Level.create({
user:user.id,
guild:message.guild.id
});

levelData.level+=amount;

await levelData.save();

return message.channel.send(
`Owner đã cho ${user} ${amount} level`
);

}

if(type==="money"){

let globalData=
await getGlobal({
user:user.id
});

if(!globalData)
globalData=
await Global.create({
user:user.id
});

globalData.money+=amount;

await globalData.save();

return message.channel.send(
`Owner đã cho ${user} ${amount} micoin`
);

}

if(type==="cash"){

let globalData=
await getGlobal({
user:user.id
});

if(!globalData)
globalData=
await Global.create({
user:user.id
});

globalData.micash+=amount;

await globalData.save();

return message.channel.send(
`Owner đã cho ${user} ${amount} micash`
);

}

}


let sender=
await getGlobal({
user:message.author.id
});

let receiver=
await getGlobal({
user:user.id
});

if(!sender)
sender=
await Global.create({
user:message.author.id
});

if(!receiver)
receiver=
await Global.create({
user:user.id
});

if(type==="money"){

if(amount>sender.money)
return message.reply(
"Không đủ micoin!"
);

sender.money-=amount;

receiver.money+=amount;

}

if(type==="cash"){

if(amount>sender.micash)
return message.reply(
"Không đủ micash!"
);

sender.micash-=amount;

receiver.micash+=amount;

}

await sender.save();
await receiver.save();

message.channel.send(
`${message.author} đã gửi ${amount} ${type} cho ${user}`
);

}

    if(cmd==="profile"){

let target;

if(message.mentions.users.first()){

target=message.mentions.users.first();

}else if(message.reference){

let msg=
await message.channel.messages.fetch(
message.reference.messageId
);

target=msg.author;

}else{

target=message.author;

}

let levelData=
await Level.findOne({
user:target.id,
guild:message.guild.id
});

if(!levelData)
levelData=
await Level.create({
user:target.id,
guild:message.guild.id
});

let globalData=
await getGlobal(target.id);

if(!globalData){

globalData=
await Global.create({
user:target.id
});

}

if(globalData.money===undefined)
globalData.money=0;

if(globalData.micash===undefined)
globalData.micash=0;

await globalData.save();



let displayLevel=
target.id===OWNER_ID?
"?":
levelData.level;

let displayXP=
target.id===OWNER_ID?
"?":
`${levelData.xp}/${levelData.level*100}`;

let displayMoney=
target.id===OWNER_ID?
"?":
levelData.money;

let displayCash=
target.id===OWNER_ID?
"?":
levelData.micash;

let displayTier=
target.id===OWNER_ID?
"Miko":
getMoneyTier(globalData.money);

const embed=
new EmbedBuilder()

.setColor("#ffa0f7")

.setAuthor({
name:target.username,
iconURL:target.displayAvatarURL({dynamic:true})
})

.setThumbnail(
target.displayAvatarURL({
dynamic:true,
size:256
})
)

.addFields(

{
name:"Level",
value:`${displayLevel}`,
inline:true
},

{
name:"XP",
value:`${displayXP}`,
inline:true
},

{
name:"Tier",
value:`${displayTier}`,
inline:true
},

{
name:"Micoin 💰",
value:`${displayMoney}`,
inline:true
},

{
name:"Micash 💎",
value:`${displayCash}`,
inline:true
}

)

.setFooter({
text:`Requested by ${message.author.username}`
})

.setTimestamp();

message.channel.send({
embeds:[embed]
});

}

    if (cmd === "givelv") {
        if (message.author.id !== OWNER_ID) return message.reply("Chỉ owner bot mới dùng được lệnh này!");
        const user = message.mentions.users.first();
        const amount = parseInt(args[2]);
        if (!user || isNaN(amount)) return message.reply(`Cú pháp: ${PREFIX}givelv @user amount`);

        let levelData=
await Level.findOne({
user:user.id,
guild:message.guild.id
});

if(!levelData)
levelData=
await Level.create({
user:user.id,
guild:message.guild.id
});

levelData.level+=amount;

        if (levelData.level >= 100) {
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

        await levelData.save();

message.channel.send(
`${user} đã được cộng **${amount} level**! Hiện tại level: ${levelData.level}`
);
    }

if(cmd==="cf"){

let choice="heads";
let bet;

if(!args[1])
return message.reply(
"mi!cf amount"
);

if(args[1]==="heads"||args[1]==="tails"){

choice=args[1].toLowerCase();

bet=args[2];

}else{

bet=args[1];

}

let globalData=
await getGlobal({
user:message.author.id
});

if(!globalData)
globalData=
await Global.create({
user:message.author.id
});

let amount;

if(bet==="all"){

amount=
Math.min(
globalData.money,
200000
);

}else{

amount=
parseInt(bet);

}

if(isNaN(amount)||amount<=0)
return message.reply(
"Số tiền không hợp lệ"
);

if(amount>200000)
amount=200000;

if(message.author.id!==OWNER_ID){

if(globalData.money<amount)
return message.reply(
"Không đủ micoin!"
);

globalData.money-=amount;

}

let msg=
await message.channel.send(
`🪙 ${message.author} chọn **${choice}** cược **${amount} micoin**`
);

let animation=[
"🪙 Đang tung coin.",
"🪙 Đang tung coin..",
"🪙 Đang tung coin...",
"🪙 Coin đang xoay 🔄"
];

let i=0;

let interval=
setInterval(()=>{

msg.edit(
animation[i%animation.length]
);

i++;

},400);

setTimeout(async()=>{

clearInterval(interval);

let result=
Math.random()<0.5?
"heads":
"tails";

let win=
choice===result;

if(win){

globalData.money+=amount*2;

await msg.edit(
`🪙 Kết quả: **${result}**
${message.author} thắng **${amount} micoin** 🎉`
);

}else{

await msg.edit(
`🪙 Kết quả: **${result}**
${message.author} thua **${amount} micoin** 💀`
);

}

await globalData.save();

},2200);

}

if(cmd==="exchange"){

let globalData=
await getGlobal(message.author.id);

let amount=parseInt(args[1]);

if(isNaN(amount)||amount<=0)
return message.reply("mi!exchange amount");

let cost=amount*1000000;

if(message.author.id!==OWNER_ID){

if(globalData.money<cost)
return message.reply("Không đủ micoin!");

globalData.money-=cost;

}

globalData.micash+=amount;

await globalData.save();

message.channel.send(
`${message.author} đã đổi **${amount} micash 💎**`
);

}

if(cmd==="slots"){

let bet=args[1];

if(!bet)
return message.reply("mi!slots amount");

let globalData=
await getGlobal(message.author.id);

let amount;

if(bet==="all"){

amount=
Math.min(globalData.money,200000);

}else{

amount=parseInt(bet);

}

if(isNaN(amount))
return message.reply("mi!slots amount");

if(amount>200000)
amount=200000;

if(globalData.money<amount)
return message.reply("Không đủ tiền");

globalData.money-=amount;

let symbols=[
"🍒",
"🍋",
"💎",
"⭐",
"🔔"
];

let s1=
symbols[Math.floor(Math.random()*symbols.length)];

let s2=
symbols[Math.floor(Math.random()*symbols.length)];

let s3=
symbols[Math.floor(Math.random()*symbols.length)];

let win=0;

if(s1===s2&&s2===s3){

win=amount*5;

}else if(s1===s2||s2===s3){

win=amount*2;

}

globalData.money+=win;

await globalData.save();

message.channel.send(
`🎰 | ${s1} | ${s2} | ${s3} |

${win>0?
`Thắng ${win} micoin`:
`Thua ${amount} micoin`
}`
);

}

if(cmd==="dice"){

let amount=parseInt(args[1]);

let globalData=
await getGlobal(message.author.id);

if(isNaN(amount))
return message.reply("mi!dice amount");

if(amount>200000)
amount=200000;

if(globalData.money<amount)
return message.reply("Không đủ tiền");

globalData.money-=amount;

let player=
Math.floor(Math.random()*6)+1;

let bot=
Math.floor(Math.random()*6)+1;

if(player>bot){

globalData.money+=amount*2;

message.channel.send(
`🎲 Bạn: ${player}
🎲 Bot: ${bot}

Bạn thắng ${amount}`
);

}else if(player===bot){

globalData.money+=amount;

message.channel.send("Hòa");

}else{

message.channel.send(
`Bạn thua ${amount}`
);

}

await globalData.save();

}

if(cmd==="roulette"){

let color=args[1];

let amount=
parseInt(args[2]);

if(!color||!amount)
return message.reply("mi!roulette red/black/green amount");

if(!["red","black","green"].includes(color))
return message.reply("Chọn red / black / green");

let globalData=
await getGlobal(message.author.id);

if(amount>200000)
amount=200000;

if(globalData.money<amount)
return;

globalData.money-=amount;

let colors=[
"red",
"black",
"green"
];

let result=
colors[
Math.floor(Math.random()*colors.length)
];

let multi=0;

if(result==="green")
multi=14;

else
multi=2;

if(color===result){

globalData.money+=amount*multi;

message.channel.send(
`🎡 Result: ${result}

Thắng ${amount*multi}`
);

}else{

message.channel.send(
`🎡 Result: ${result}

Thua ${amount}`
);

}

await globalData.save();

}

if(cmd==="help"){

const embed=
new EmbedBuilder()

.setColor("#347bff")

.setTitle("Miko's Bot Commands")

.setDescription(
"Prefix: **mi!**"
)

.addFields(

{
name:"🎮 Level",
value:
"`mi!level`\nXem level",
inline:true
},

{
name:"💰 Economy",
value:
"`mi!money`\n`mi!daily`\n`mi!profile`",
inline:true
},

{
name:"💸 Transfer",
value:
"`mi!give @user money amount`\n`mi!give @user cash amount`",
inline:true
},

{
name:"🎰 Casino",
value:
"`mi!cf`\n`mi!slots`\n`mi!dice`\n`mi!roulette`",
inline:true
},

{
name:"💎 Currency",
value:
"`mi!exchange`\n(1 micash = 1M micoin)",
inline:true
}

)

.setFooter({
text:"Miko's Bot"
})

.setTimestamp();

message.channel.send({
embeds:[embed]
});

}

});

client.login(BOT_TOKEN);