(async()=>{
    "use strict";

    require("dotenv").config()

    // Dependencies
    const { Client, Intents, MessageEmbed } = require("discord.js")
    const _ = require("lodash")
    const fs = require("fs")

    // Variables
    const settings = require("./settings.json")
    const bCommands = require("./commands.json")
    const bot = new Client({ intents: [ Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGE_REACTIONS, Intents.FLAGS.DIRECT_MESSAGES, Intents.FLAGS.GUILD_MEMBERS ] })
    const premiumAccounts = fs.readdirSync("./premium-accounts").map((f)=>`./premium-accounts/${f.toLowerCase()}`)
    const freeAccounts = fs.readdirSync("./free-accounts").map((f)=>`./free-accounts/${f.toLowerCase()}`)
    const cooldowns = []

    // Functions
    const userCS = (userID)=>{return cooldowns.includes(`${userID}:free`) ? "free" : cooldowns.includes(`${userID}:premium`) ? "premium" : false}
    const sendCooldown = async(interaction, premium)=>{userCS(interaction.user.id) === "premium" ? await interaction.reply(settings.cooldowns.premiumMessage) : await interaction.reply(settings.cooldowns.freeMessage)}

    // Main
    if(!freeAccounts.length) return console.log("There are no services found in free accounts folder.")
    if(!premiumAccounts.length) return console.log("There are no services found in premium accounts folder.")
 
    bot.on("ready", ()=>{
        bot.guilds.cache.forEach((guild)=>{guild.commands.set([])})
        bot.guilds.cache.forEach((guild)=>{guild.commands.cache.forEach((command)=>{guild.commands.delete(command)})})
    
        const commands = bot.application?.commands
        for( const command of bCommands ) commands?.create(command)

        bot.user.setActivity("Cooking some accounts.")
        console.log("WokeGen is running.")
    })

    bot.on("guildMemberAdd", async(member)=>checkUser(member))

    bot.on("interactionCreate", async(interaction)=>{
        if(!interaction.isCommand()) return
        if(interaction.guild.id !== settings.guildID) return
    
        if(interaction.commandName === "help"){
            const embed = new MessageEmbed()
            .setTitle("WokeGen | Help")
            .addFields(
                { name: "/help", value: "Display the help menu." },
                { name: "/generate", value: "Generate an account from the specified service." },
                { name: "/stock", value: "Display the bot accounts stock." }
            )
            .setFooter("Made by I2rys")

            await interaction.reply({ embeds: [embed] })
        }else if(interaction.commandName === "stock"){
            const fA = []
            const pA = []

            for( const f in freeAccounts ){
                const service = freeAccounts[f].replace("./free-accounts/", "").replace(".txt", "")
                fA.push(`${f+1}. ${service.charAt(0).toUpperCase() + service.slice(1)} | ${fs.readFileSync(freeAccounts[f], "utf8").replace(/\r/g, "").split("\n").filter((d)=>d).length}`)
            }
            for( const f in premiumAccounts ){
                const service = premiumAccounts[f].replace("./premium-accounts/", "").replace(".txt", "")
                pA.push(`${f+1}. ${service.charAt(0).toUpperCase() + service.slice(1)} | ${fs.readFileSync(premiumAccounts[f], "utf8").replace(/\r/g, "").split("\n").filter((d)=>d).length}`)
            }

            const embed = new MessageEmbed()
            .setTitle("WokeGen | Stock")
            .addFields(
                { name: "Free", value: fA.join("\n") },
                { name: "Premium", value: pA.join("\n") }
            )
            .setFooter("Made by I2rys")

            await interaction.reply({ embeds: [embed] })
        }else if(interaction.commandName === "generate"){
            const service = interaction.options.getString("service", true)

            if(interaction.member.roles.cache.has(settings.roles.premium)){
                if(userCS(interaction.user.id)) return sendCooldown(interaction, interaction.member.roles.cache.has(settings.roles.premium))
                const sP = `./premium-accounts/${service.toLowerCase()}.txt`
                if(!premiumAccounts.includes(sP)) return await interaction.reply({ content: "Unable to find the specified service.", ephemeral: true })

                // Get account
                var accounts = fs.readFileSync(sP, "utf8").split("\n").filter((d)=>d)
                if(!accounts.length) return await interaction.reply({ content: "No stock for this service.", ephemeral: true })
                const rAI = Math.floor(Math.random() * accounts.length)
                const account = accounts[rAI]

                // Delete selected account & rewrite stock obvious
                delete accounts[rAI]
                accounts = accounts.filter((a)=>a)
                fs.writeFileSync(sP, accounts.join("\n"), "utf8")

                // Send em
                const embed = new MessageEmbed()
                .setTitle("WokeGen")
                .setDescription(`Plan: Premium\nService: ${service.charAt(0).toUpperCase() + service.slice(1)}\nAccount: **${account}**`)
                .setFooter("Sent from WokeGen.")

                await interaction.user.send({ embeds: [embed] })
                const cM = `${interaction.user.id}:premium`
                cooldowns.push(cM)
                await interaction.reply("Check your DM.")
                setTimeout(()=>_.pull(cooldowns, cM), settings.cooldowns.premium * 1000)
            }else{
                if(userCS(interaction.user.id)) return sendCooldown(interaction, interaction.member.roles.cache.has(settings.roles.premium))
                const sP = `./free-accounts/${service.toLowerCase()}.txt`
                if(!freeAccounts.includes(sP)) return await interaction.reply({ content: "Unable to find the specified service.", ephemeral: true })

                // Get account
                var accounts = fs.readFileSync(sP, "utf8").split("\n").filter((d)=>d)
                if(!accounts.length) return await interaction.reply({ content: "No stock for this service.", ephemeral: true })
                const rAI = Math.floor(Math.random() * accounts.length)
                const account = accounts[rAI]

                // Delete selected account & rewrite stock
                delete accounts[rAI]
                accounts = accounts.filter((a)=>a)
                fs.writeFileSync(sP, accounts.join("\n"), "utf8")

                // Send em
                const embed = new MessageEmbed()
                .setTitle("WokeGen")
                .setDescription(`Plan: Free\nService: ${service.charAt(0).toUpperCase() + service.slice(1)}\nAccount: **${account}**`)
                .setFooter("Sent from WokeGen.")

                await interaction.user.send({ embeds: [embed] })
                const cM = `${interaction.user.id}:free`
                cooldowns.push(cM)
                await interaction.reply("Check your DM.")
                setTimeout(()=>_.pull(cooldowns, cM), settings.cooldowns.free * 1000)
            }
        }
    })

    bot.login(settings.token)
})()