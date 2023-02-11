const translation = require('./Translation.json');

module.exports = {
    Run: function(itemFiles) {
        // Main function
        const parsedItems = ParseItems(itemFiles.items);
        const parsedTags = ParseTags(itemFiles.tags);
        const parsedGridConfigs = ParseGridConfigs(itemFiles.gridConfigs);
        const parsedContainerConfigs = ParseContainerConfigs(itemFiles.containerCongfigs);

        const parsedData = [];

        parsedItems.forEach(itemFile => {
            let tags = [];

            itemFile.Tags.forEach(tag => {
                let name = parsedTags.find(x => x.id === tag.Id.Value).m_Name;
                let tagTranslation = translation.tags[name];
                if(!tagTranslation) return;
                tags.push(tagTranslation.rus);
            });
            itemFile.Tags = tags;
            if(!tags[0]) return;

            let furnitureItemConfigs = ParseConfigs(itemFiles.configs, itemFile.DataID);
            if(furnitureItemConfigs) {
                for(let key in furnitureItemConfigs) {
                    itemFile[key] = furnitureItemConfigs[key];
                }
            }
            delete itemFile.DataID;

            // fix for names
            let m_Name = itemFile.m_Name;
            switch(m_Name) {
                case 'Shelf_Small': m_Name = 'Shelf_1'; break;
                case 'Shelf_Medium': m_Name = 'Shelf_2'; break;
                case 'Shelf_Large': m_Name = 'Shelf_3'; break;
                case 'HiFi_1': m_Name = 'HiFi'; break;
                case 'Gramophone_1': m_Name = 'Gramophone'; break;
                case '': m_Name = ''; break;
            }

            let gridConfigs = parsedGridConfigs.find(x => x.m_Name === m_Name + '_GridObjectConfig');
            if(gridConfigs) {
                itemFile.Width = gridConfigs.Width;
                itemFile.Height = gridConfigs.Height;
            }

            let containerConfigs = parsedContainerConfigs.find(x => x.m_Name === 'Items/' + itemFile.m_Name);
            if(containerConfigs) {
                itemFile.Capacity = containerConfigs.Capacity;
            }

            let vaseConfigs = ParseVaseConfigs(itemFiles.configs, itemFile.VaseDataID);
            if(vaseConfigs) {
                for(let key in vaseConfigs) {
                    itemFile[key] = vaseConfigs[key];
                }
            }
            delete itemFile.VaseDataID;
            
            parsedData.push(itemFile);
        });

        return parsedData;
    }
}

function ParseConfigs(files, dataID) {
    let configs = files.find(x => x.Settings.Identifier.Guid.Value === dataID);
    if(!configs) return;
    let { ImagoPoints } = configs.Settings;

    let sortedData = {}

    if(ImagoPoints) sortedData.ImagoPoints = ImagoPoints;

    return sortedData;
}
function ParseVaseConfigs(files, dataID) {
    let configs = files.find(x => x.Settings.Identifier.Guid.Value === dataID);
    if(!configs) return;
    let { Capacity, Productivity } = configs.Settings;

    let sortedData = {
        BulletCapacity: Capacity, 
        Productivity,
    }

    return sortedData;
}

// Parse item common files
function ParseItems(files) {
    const parsedData = [];
    files.forEach(fileData => {
        let { m_Name, Settings } = fileData;
        let { Value, Data, Tags } = Settings;

        let EngName, RusName;
        if(translation.furniture[m_Name]) {
            EngName = translation.furniture[m_Name].eng;
            RusName = translation.furniture[m_Name].rus;
        }
        
        let sortedData = {
            m_Name,
            EngName,
            RusName,
            Value,
            Tags,
        }

        // if(EngName.startsWith('!')) {
        //     sortedData.EngName = EngName.substring(1);
        //     sortedData.NotInGame = 1;
        // }

        if(Data[0]) sortedData.DataID = Data[0].Id.Value;
        if(Data[1]) sortedData.VaseDataID = Data[1].Id.Value;

        parsedData.push(sortedData);
    });
    return parsedData;
}

// Parse tags files
function ParseTags(files) {
    const parsedData = [];
    files.forEach(fileData => {
        let { m_Name, Settings } = fileData;

        let sortedData = {
            m_Name,
            id: Settings.Identifier.Guid.Value
        }
        parsedData.push(sortedData);
    });
    return parsedData;
}

// Parse grid configs
function ParseGridConfigs(files) {
    const parsedData = [];
    files.forEach(fileData => {
        let { m_Name, Settings } = fileData;
        let { Width, Height } = Settings;

        let sortedData = {
            m_Name,
            Width,
            Height,
        }
        parsedData.push(sortedData);
    });
    return parsedData;
}

function ParseContainerConfigs(files) {
    const parsedData = [];
    files.forEach(fileData => {
        let { m_Name, Settings } = fileData;
        let { Capacity, Name } = Settings;

        m_Name = Name;

        let sortedData = {
            m_Name,
            Capacity,
        }
        parsedData.push(sortedData);
    });
    return parsedData;
}