/**
 * @file buy command
 * @author Sankarsan Kampa (a.k.a k3rn31p4nic)
 * @license MIT
 */

exports.exec = async (Bastion, message, args) => {
  try {
    if (!args.index) {
      /**
      * The command was ran with invalid parameters.
      * @fires commandUsage
      */
      return Bastion.emit('commandUsage', message, this.help);
    }

    let shopModel = await Bastion.database.models.shop.findOne({
      attributes: [ 'custom' ],
      where: {
        guildID: message.guild.id
      }
    });

    let itemsInShop;
    if (shopModel && shopModel.dataValues.custom) {
      itemsInShop = shopModel.dataValues.custom;
    }
    else {
      itemsInShop = [];
    }

    args.index = Math.abs(args.index);
    args.index = args.index - 1;

    if (args.index > itemsInShop.length) {
      return Bastion.emit('error', Bastion.strings.error(message.guild.language, 'notFound'), Bastion.strings.error(message.guild.language, 'indexRange', true), message.channel);
    }

    // Check if user has sufficient balance
    let guildMemberModel = await Bastion.database.models.guildMember.findOne({
      attributes: [ 'bastionCurrencies' ],
      where: {
        userID: message.author.id
      }
    });
    let userBalance = parseInt(guildMemberModel.dataValues.bastionCurrencies);

    if (userBalance < parseInt(itemsInShop[args.index].value)) {
      return Bastion.emit('error', Bastion.strings.error(message.guild.language, 'insufficientBalance'), Bastion.strings.error(message.guild.language, 'insufficientBalance', true, userBalance), message.channel);
    }

    // Add item to user's item list
    let itemsModel = await Bastion.database.models.items.findOne({
      attributes: [ 'custom' ],
      where: {
        userID: message.author.id,
        guildID: message.guild.id
      }
    });

    let userItems;
    if (itemsModel && itemsModel.dataValues.custom) {
      userItems = itemsModel.dataValues.custom;
    }
    else {
      userItems = [];
    }

    userItems.push(itemsInShop[args.index].name);

    await Bastion.database.models.items.upsert({
      userID: message.author.id,
      guildID: message.guild.id,
      custom: userItems
    },
    {
      where: {
        userID: message.author.id,
        guildID: message.guild.id
      },
      fields: [ 'userID', 'guildID', 'custom' ]
    });

    // Transaction
    Bastion.emit('userCredit', message.author, itemsInShop[args.index].value);

    if (message.author.id !== message.guild.owner.id) {
      Bastion.emit('userDebit', message.guild.owner, (0.9) * itemsInShop[args.index].value);
    }

    message.channel.send({
      embed: {
        color: Bastion.colors.GREEN,
        description: `${message.author.tag} bought **${itemsInShop[args.index].name}** for **${itemsInShop[args.index].value}** Bastion Currencies.`
      }
    }).catch(e => {
      Bastion.log.error(e);
    });
  }
  catch (e) {
    Bastion.log.error(e);
  }
};

exports.config = {
  aliases: [],
  enabled: true,
  argsDefinitions: [
    { name: 'index', type: Number, defaultOption: true }
  ]
};

exports.help = {
  name: 'buy',
  botPermission: '',
  userTextPermission: '',
  userVoicePermission: '',
  usage: 'buy <ITEM_INDEX>',
  example: [ 'buy 3' ]
};
