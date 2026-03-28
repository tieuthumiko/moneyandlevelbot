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

inventory:{
type:Array,
default:[]
},

married:{
type:String,
default:null
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

id=String(id);

let data=
await Global.findOne({
user:id
});

if(!data){

data=
await Global.create({
user:id
});

}

return data;

}

client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    if(!message.guild) return;

    const key = message.author.id + message.guild.id;

    if (!message.content.toLowerCase().startsWith(PREFIX.toLowerCase())) {

if (!canGain(key)) return;

let levelData=
await Level.findOne({
user:message.author.id,
guild:message.guild.id
});

if(!levelData)
levelData=
await Level.create({
user:message.author.id,
guild:message.guild.id
});

let globalData=
await getGlobal(message.author.id);

levelData.xp+=getXP();

globalData.money+=getMicoin();

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

    const content =
message.content.toLowerCase();

if(!content.startsWith(
PREFIX.toLowerCase()
)) return;

const args =
content
.slice(PREFIX.length)
.trim()
.split(/\s+/);

const shop={

ring1:{
name:"Silver Ring",
price:5
},

ring2:{
name:"Golden Ring",
price:15
},

ring3:{
name:"Diamond Ring",
price:50
}

};

const cmd =
args[0];


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

    if(cmd==="coin"){

let globalData =
await getGlobal(message.author.id);

if(!globalData)
globalData=
await Global.create({
user:message.author.id
});

message.channel.send(
`${message.author} hiện có **${globalData.money} micoin** 💰 (${getMoneyTier(globalData.money)})`
);

}

if(cmd==="marry"){

let user=
message.mentions.users.first();

let ring=args[2];

if(!user||!ring)
return;

let sender=
await getGlobal(
message.author.id
);

let target=
await getGlobal(
user.id
);

if(!sender.inventory.includes(ring))
return message.reply(
"Bạn không có nhẫn"
);

if(sender.married)
return message.reply(
"Bạn đã kết hôn"
);

message.channel.send(
`${user}

${message.author} muốn marry bạn

Gõ:
mi!marry accept`
);

client.marryProposals=
client.marryProposals||new Map();

client.marryProposals.set(
user.id,
message.author.id
);

}

if(cmd==="marry"&&args[1]==="accept"){

let proposer=
client.marryProposals?.get(
message.author.id
);

if(!proposer)
return;

let sender=
await getGlobal(proposer);

let target=
await getGlobal(
message.author.id
);

sender.married=
message.author.id;

target.married=
proposer;

await sender.save();

await target.save();

client.marryProposals.delete(
message.author.id
);

message.channel.send(
"💍 Hai người đã kết hôn!"
);

}

if(cmd==="divorce"){

let globalData=
await getGlobal(
message.author.id
);

if(!globalData.married)
return;

let partner=
globalData.married;

message.channel.send(
`Gửi yêu cầu divorce

${partner}
gõ:

mi!divorce accept`
);

client.divorce=
client.divorce||new Map();

client.divorce.set(
partner,
message.author.id
);

}

if(cmd==="divorce"&&args[1]==="accept"){

let partner=
client.divorce?.get(
message.author.id
);

if(!partner)
return;

let sender=
await getGlobal(partner);

let target=
await getGlobal(
message.author.id
);

sender.married=null;

target.married=null;

await sender.save();

await target.save();

client.divorce.delete(
message.author.id
);

message.channel.send(
"💔 Đã ly hôn"
);

}

if(cmd==="buy"){

let id=args[1];

if(!shop[id])
return;

let item=
shop[id];

let userId=
message.author.id;

let globalData=
await getGlobal(userId);

if(globalData.micash<item.price)
return message.reply(
"Không đủ micash"
);

await Global.updateOne(

{user:userId},

{
$inc:{
micash:-item.price
},

$push:{
inventory:id
}

}

);

message.channel.send(
`Đã mua ${item.name}`
);

}

if(cmd==="shop"){

let text="💎 Shop (micash only)\n\n";

for(let id in shop){

text+=`
${id}
${shop[id].name}

Price: ${shop[id].price} cash

`;

}

message.channel.send(text);

}

    if(cmd==="daily"){

let globalData =
await getGlobal(message.author.id);

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
type=type.toLowerCase();

if(["coin","coins","micoin"].includes(type))
type="money";

if(["cash","micash","gem"].includes(type))
type="cash";
let amount=parseInt(args[3]);

if(!user||!type||isNaN(amount))
return message.reply(
"mi!give @user money/cash amount"
);

if(amount<=0)
return message.reply("Amount phải > 0");

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
await getGlobal(user.id); 

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
await getGlobal(user.id);

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
await getGlobal(message.author.id);

let receiver=
await getGlobal(user.id);

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

if(amount<=0)
return message.reply("Amount phải > 0");

sender.money-=amount;

receiver.money+=amount;

}

if(type==="cash"){

if(amount>sender.micash)
return message.reply(
"Không đủ micash!"
);

if(amount<=0)
return message.reply("Amount phải > 0");

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
globalData.money;

let displayCash=
target.id===OWNER_ID?
"?":
globalData.micash;

let displayTier=
target.id===OWNER_ID?
"Miko":
getMoneyTier(globalData.money || 0);

let marriedText="Single";

if(globalData.married){

let user=
await client.users.fetch(
globalData.married
);

marriedText=
`Married với ${user.username}`;

}

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
},

{
name:"Marriage 💍",
value:marriedText
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
"mi!cf heads/tails amount"
);

if(args[1]==="heads"||args[1]==="tails"){

choice=args[1].toLowerCase();

bet=args[2];

}else{

bet=args[1];

}

let globalData=
await getGlobal(message.author.id);

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

await Global.updateOne(
{user:userId},
{$inc:{money:-bet}}
);

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

await Global.updateOne(
{user:userId},
{$inc:{money:bet*2}}
);

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

let type=args[1];

let amount=parseInt(args[2]);

if(!type||isNaN(amount))
return message.reply(
"mi!exchange coin/cash amount"
);

let userId=
message.author.id;

let globalData=
await getGlobal(userId);

if(type==="coin"){

let cost=
amount*1000000;

if(globalData.money<cost)
return message.reply(
"Không đủ micoin"
);

await Global.updateOne(
{user:userId},
{
$inc:{
money:-cost,
micash:amount
}
}
);

message.channel.send(
`Đã đổi ${cost} coin → ${amount} cash 💎`
);

}

if(type==="cash"){

if(globalData.micash<amount)
return;

await Global.updateOne(
{user:userId},
{
$inc:{
micash:-amount,
money:amount*800000
}
}
);

message.channel.send(
`Đã đổi ${amount} cash → ${amount*800000} coin 💰`
);

}

}

if(cmd==="slots"){

let bet=args[1];

if(!bet)
return message.reply("mi!slots amount");

let userId=
message.author.id;

let globalData=
await getGlobal(userId);

let amount;

if(bet==="all"){

amount=
Math.min(globalData.money,200000);

}else{

amount=
parseInt(bet);

}

if(isNaN(amount)||amount<=0)
return;

if(globalData.money<amount)
return message.reply("Không đủ tiền");

await Global.updateOne(
{user:userId},
{$inc:{money:-amount}}
);

let symbols=[
"🍒",
"🍋",
"💎",
"⭐",
"🔔"
];

let msg=
await message.channel.send(
"🎰 | ❓ | ❓ | ❓ |"
);

let interval=
setInterval(()=>{

let s1=
symbols[Math.floor(Math.random()*5)];

let s2=
symbols[Math.floor(Math.random()*5)];

let s3=
symbols[Math.floor(Math.random()*5)];

msg.edit(
`🎰 | ${s1} | ${s2} | ${s3} |`
);

},150);

setTimeout(async()=>{

clearInterval(interval);

let s1=
symbols[Math.floor(Math.random()*5)];

let s2=
symbols[Math.floor(Math.random()*5)];

let s3=
symbols[Math.floor(Math.random()*5)];

let win=0;

if(s1===s2&&s2===s3){

win=amount*5;

}else if(s1===s2||s2===s3){

win=amount*2;

}

if(win>0){

await Global.updateOne(
{user:userId},
{$inc:{money:win}}
);

}

msg.edit(
`🎰 | ${s1} | ${s2} | ${s3} |

${win>0?
`Thắng ${win}`:
`Thua ${amount}`
}`
);

},2200);

}

if(cmd==="dice"){

let bet=args[1];

if(!bet)
return message.reply("mi!dice amount");

let userId=message.author.id;

let globalData=
await getGlobal(userId);

let amount;

if(bet==="all"){

amount=
Math.min(globalData.money,200000);

}else{

amount=parseInt(bet);

}

if(isNaN(amount)||amount<=0)
return message.reply("Amount không hợp lệ");

if(amount>200000)
amount=200000;



if(globalData.money<amount)
return message.reply("Không đủ tiền");

await Global.updateOne(
{user:userId},
{$inc:{money:-amount}}
);

let msg=
await message.channel.send(
"🎲 Rolling..."
);

let interval=
setInterval(()=>{

let r1=
Math.floor(Math.random()*6)+1;

let r2=
Math.floor(Math.random()*6)+1;

msg.edit(
`🎲 ${r1} vs ${r2}`
);

},200);

setTimeout(async()=>{

clearInterval(interval);

let player=
Math.floor(Math.random()*6)+1;

let bot=
Math.floor(Math.random()*6)+1;

if(player>bot){

await Global.updateOne(
{user:userId},
{$inc:{money:amount*2}}
);

msg.edit(
`🎲 Bạn: ${player}
🎲 Bot: ${bot}

Thắng ${amount}`
);

}else if(player===bot){

await Global.updateOne(
{user:userId},
{$inc:{money:amount}}
);

msg.edit(
`🎲 ${player} vs ${bot}

Hòa`
);

}else{

msg.edit(
`🎲 Bạn: ${player}
🎲 Bot: ${bot}

Thua ${amount}`
);

}

},2000);

}

if(cmd==="roulette"){

let color=
args[1];

let amount=
parseInt(args[2]);

if(!color||isNaN(amount))
return message.reply(
"mi!roulette red/black/green amount"
);

if(amount<=0)
return;

let userId=
message.author.id;

let globalData=
await getGlobal(userId);

if(globalData.money<amount)
return message.reply("Không đủ tiền");

await Global.updateOne(
{user:userId},
{$inc:{money:-amount}}
);

let msg=
await message.channel.send(
"🎡 Spinning..."
);

let spin=[
"🔴 ⚫ 🟢",
"⚫ 🟢 🔴",
"🟢 🔴 ⚫"
];

let i=0;

let interval=
setInterval(()=>{

msg.edit(
`🎡 ${spin[i%3]}`
);

i++;

},300);

setTimeout(async()=>{

clearInterval(interval);

let colors=[
"red",
"black",
"green"
];

let result=
colors[
Math.floor(Math.random()*3)
];

let multi=
result==="green"?
14:
2;

if(color===result){

let win=
amount*multi;

await Global.updateOne(
{user:userId},
{$inc:{money:win}}
);

msg.edit(
`🎡 Result: ${result}

Thắng ${win}`
);

}else{

msg.edit(
`🎡 Result: ${result}

Thua ${amount}`
);

}

},2500);

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

process.on("unhandledRejection",err=>{
console.log("Unhandled Rejection:",err);
});

process.on("uncaughtException",err=>{
console.log("Uncaught Exception:",err);
});