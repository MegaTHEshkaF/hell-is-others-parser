// TODO
// Парсинг мебели
// Парсинг магазинов
// Парсинг врагов

// Import modules and scripts
const fs = require('fs');
const itemsParser = require('./itemsParser.js');
const furnitureParser = require('./furnitureParser.js');

function ChildrenNames(obj, original) {
    let string = JSON.stringify(obj, null, 4);
    if(string.match(1241302036290318611)) {
        console.log(original.m_Name);
    }
    // for (const [key, value] of Object.entries(obj)) {
    //     if(key.includes("Imagos")) {
    //         //if(value.BonusPoints == 0 || value.length == 0) return;
    //         console.log(original.m_Name);
    //     }
    //     else if(Array.isArray(value)) 
    //         value.forEach(x => { ChildrenNames(x, original); });
    //     else if(typeof value === 'object' && value !== null) 
    //         ChildrenNames(value, original);
    // }
}

// Sort JSON files
const dir = './MonoBehaviour/';
const filenames = fs.readdirSync(dir);
const itemFiles = { items: [], configs: [], tags: [], effects: [] }, 
furnitureFiles = { items: [], configs: [], tags: [], gridConfigs: [], containerCongfigs: [] },
shopsFiles = [], commerceConfigsFiles = [], enemiesFiles = [], 
containersFiles = [], virtualItemsFiles = [], otherFiles = [], 
playerCharacterFiles = [], unknwonFiles = [];
filenames.forEach(filename => {
    let file = require(dir + filename);
    // console.log(data);
    // ChildrenNames(file, file);
    if(file.Settings == undefined) return RemoveFile(filename); // Useless data
    if(file.m_Name.includes("Navmesh")) return RemoveFile(filename); // Useless data

    // Cut "QuantumAssets/"
    let path = file.Settings.Identifier.Path.substring(14);

    if(path.startsWith('States/') || 
    path.startsWith('StaticColliderConfigs/') || 
    path.startsWith('ItemTagIcons/') || 
    path.startsWith('ObjectMaterials/') || 
    path.startsWith('NpcsEntityInfo/') || 
    path.startsWith('Interactions/')) return RemoveFile(filename); // Useless data

    // Items
    if(path.startsWith('InventoryItems/')) {
        if(file.m_Name.includes("Config")) return  itemFiles.configs.push(file); // Fix for FakeHeart_Config
        else return itemFiles.items.push(file);
    }
    // Item configs
    if(path.startsWith('Weapons/') || 
    path.startsWith('Traps/') || 
    path.startsWith('Throwables/') || 
    path.startsWith('MeleeWeapons/') || 
    path.startsWith('UsableItemsConfigs/') || 
    path.startsWith('BulletConfigs/') || 
    path.startsWith('FertiliserConfigs/') ||
    path.startsWith('StatBuffConfigs/') ||
    path.startsWith('DeceiversConfig/')) {
        if(path.endsWith('Deodorant_StatBuffConfig')) return itemFiles.configs.push(file); // Deodorant fix
        if(path.endsWith('Effects') || path.endsWith('EffectOverTimeConfig') || path.endsWith('StatBuffConfig')) return itemFiles.effects.push(file);
        else return itemFiles.configs.push(file);
    }
    // Item & Furniture Tags
    if(path.startsWith('ItemTags/')) {
        furnitureFiles.tags.push(file);
        return itemFiles.tags.push(file);
    }

    // Furniture
    if(path.startsWith('VirtualItems/HubItems/')) {
        if(file.m_Name.includes("Config")) return  furnitureFiles.configs.push(file);
        else return furnitureFiles.items.push(file);
    }
    if(path.startsWith('Hub/VaseConfig/')) return  furnitureFiles.configs.push(file);
    // Furniture Tags
    if(path.startsWith('CategoryTags/')) return furnitureFiles.tags.push(file);
    // Furniture Grid Configs
    if(path.startsWith('Hub/GridObjects/')) return furnitureFiles.gridConfigs.push(file);

    // Shops
    if(path.startsWith('Shops/')) return shopsFiles.push(file);
    // Commerce
    if(path.startsWith('CommerceConfigs/')) return commerceConfigsFiles.push(file);

    // Enemies
    if(path.startsWith('Enemies')) return enemiesFiles.push(file);

    // ItemContainers
    if(path.startsWith('ItemContainers/Hub/')) return furnitureFiles.containerCongfigs.push(file);
    if(path.startsWith('ItemContainers/')) return containersFiles.push(file);

    // VirtualItems
    if(path.startsWith('VirtualItems/')) return virtualItemsFiles.push(file);

    // PlayerCharacter
    if(path.startsWith('PlayerCharacter/')) return playerCharacterFiles.push(file);

    // Other
    if(path.startsWith('Scenes/')) return otherFiles.push(file);

    return unknwonFiles.push(file);
});

// Statistics
console.log("All: " + filenames.length);
console.log("Items: " + itemFiles.items.length);
console.log("Item_configs: " + itemFiles.configs.length);
console.log("Item_tags: " + itemFiles.tags.length);
console.log("Furniture: " + furnitureFiles.items.length);
console.log("Furniture_configs: " + furnitureFiles.configs.length);
console.log("Furniture_tags: " + furnitureFiles.tags.length);
console.log("Shops: " + shopsFiles.length);
console.log("Commerce_configs: " + commerceConfigsFiles.length);
console.log("Enemies: " + enemiesFiles.length);
console.log("Item Containers: " + containersFiles.length);
console.log("VirtualItems: " + virtualItemsFiles.length);
console.log("PlayerCharacter: " + playerCharacterFiles.length);
console.log("Other: " + otherFiles.length);
console.log("Unknown: " + unknwonFiles.length);
// console.log(unknwonFiles);
// console.log(unknwonFiles.map(x => x.Settings.Identifier.Path));
console.log("Useless data deleted");

// Parse data to wiki format
const itemData = itemsParser.Run(itemFiles);
// const itemDataNames = [];
// itemData.forEach(file => {
//     itemDataNames.push(file.RusName);
// });
const furnitureData = furnitureParser.Run(furnitureFiles);
const furnitureDataNames = [];
furnitureData.forEach(file => {
    if(file.Tags.includes('Обои')) furnitureDataNames.push(file.RusName);
});


fs.writeFile('./Output/WikiData_items.json', JSON.stringify(itemData, null, 4), err => {
    if (err) {
        console.error(err);
    }
});
// fs.writeFile('./Output/WikiData_items_names.json', JSON.stringify(itemDataNames, null, 1), err => {
//     if (err) {
//         console.error(err);
//     }
// });

fs.writeFile('./Output/WikiData_furniture.json', JSON.stringify(furnitureData, null, 4), err => {
    if (err) {
        console.error(err);
    }
});
// fs.writeFile('./Output/WikiData_items_names.json', JSON.stringify(furnitureDataNames, null, 1), err => {
//     if (err) {
//         console.error(err);
//     }
// });

function RemoveFile(filename) {
    fs.unlink(dir + filename, err => {
        if (err) {
            console.error(err);
        }
    });
}

// Убрать дубликаты изображений
// const images = fs.readdirSync('./Texture2D');
// images.forEach(filename => {
//     if(filename.includes('#')) {
//         fs.unlinkSync('./Texture2D/' + filename);
//     }
// });