const translation = require('./Translation.json');

module.exports = {
    Run: function(itemFiles) {
        // Main function

        const parsedItems = ParseItems(itemFiles.items);
        const parsedTags = ParseTags(itemFiles.tags);
        const parsedEffects = ParseEffects(itemFiles.effects);

        const parsedData = [];

        parsedItems.forEach(itemFile => {
            let itemType = 0;
            let tags = [];
            let hasTime = false;
            
            itemFile.Tags.forEach(tag => {
                let name = parsedTags.find(x => x.id === tag.Id.Value).m_Name;

                if(!itemType) {
                    switch(name) {
                        case 'BulletTag': itemType = 7; break;
                        case 'FertiliserTag': itemType = 6; break;
                        case 'DeviceTag': itemType = 5; break;
                        case 'MeleeTag': itemType = 4; break;
                        case 'FirearmTag': itemType = 3; break;
                        case 'EnhancerTag': itemType = 2; break;
                        case 'UsableTag': 
                        case 'ConsumableTag': itemType = 1; break;
                    }
                }
                if(name == 'ConsumableTag' || name == 'DeviceTag' || name == 'UsableTag') hasTime = true;

                let tagTranslation = translation.tags[name];
                if(!tagTranslation) return;
                tags.push(tagTranslation.rus);
            });
            itemFile.Tags = tags;
            itemFile.Type = itemType;
            if(!hasTime) {
                delete itemFile.UseTime;
            }

            if(itemFile.Type) {
                let parsedConfigs = ParseConfigs(itemFiles.configs, itemFile.DataID, itemFile.Type);
                if(parsedConfigs) {
                    for(let key in parsedConfigs) {
                        itemFile[key] = parsedConfigs[key];
                    }
                }
                delete itemFile.DataID;

                if(itemFile.MaxDurability) {
                    itemFile.Durability = Math.abs(Math.round(itemFile.MaxDurability / itemFile.Durability));
                    delete itemFile.MaxDurability;
                }

                if(itemFile.BuffsID) {
                    for(var i = 0; i < itemFile.BuffsID.length; i++) {
                        let buffID = itemFile.BuffsID[i];
                        let buffs = parsedEffects.find(x => x.id === buffID);
                        if(buffs) {
                            for(let key in buffs) {
                                if(key == 'Duration') itemFile[`${key}_${i + 1}`] = buffs[key];
                                else itemFile[key] = buffs[key];
                            }
                            delete itemFile.id;
                        }
                    }
                    delete itemFile.BuffsID;
                }
            }
            parsedData.push(itemFile);
        });
        return parsedData;
    }
}

// Parse item common files
function ParseItems(files) {
    const parsedData = [];
    files.forEach(fileData => {
        let { m_Name, Settings, ItemRarity } = fileData;
        let { StackSize, Value, BloodAmount, MaxDurability, Data, ItemUseTime, Tags } = Settings;

        let EngName, RusName;
        if(translation.items[m_Name]) {
            EngName = translation.items[m_Name].eng;
            RusName = translation.items[m_Name].rus;
        }

        switch(ItemRarity) {
            case 1: ItemRarity = "green"; break;
            case 2: ItemRarity = "blue"; break;
            case 3: ItemRarity = "purple"; break;
            case 4: ItemRarity = "yellow"; break;
            default: ItemRarity = "grey"; break;
        }
        
        let sortedData = {
            m_Name,
            EngName,
            RusName,
            Stack: StackSize,
            Value,
            Tags,
            Rarity: ItemRarity
        }

        if(EngName.startsWith('!')) {
            sortedData.EngName = EngName.substring(1);
            sortedData.NotInGame = 1;
        }

        if(Data[0]) sortedData.DataID = Data[0].Id.Value;

        if(BloodAmount) sortedData.BloodAmount = BloodAmount;
        if(MaxDurability) sortedData.MaxDurability = MaxDurability;

        if(ItemUseTime) {
            ItemUseTime = ParseRawVaue(ItemUseTime);
            if(ItemUseTime) sortedData.UseTime = ItemUseTime;
        }

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

// Parse effects files
function ParseEffects(files) {
    const parsedData = [];
    files.forEach(fileData => {
        // console.log(fileData);
        let { Settings } = fileData;
        let { Effects, Duration, TotalTicks, TimeBetweenTicks, HealthModifier, StaminaModifier } = Settings;

        let sortedData = { id: Settings.Identifier.Guid.Value }

        if(Effects) {
            // Shrooms, Deodorant
            if(Duration.RawValue) sortedData.Duration = ParseRawVaue(Duration);

            Effects.forEach(effect => {
                let buff = ParseRawVaue(effect.Multiplier.RawValue) / 1000;
                switch(effect.Stat) {
                    case 4: return sortedData.MaxHealth = buff;
                    case 5: return sortedData.MaxStamina = buff;
                    case 7: return sortedData.Sight = buff;
                    case 8: return sortedData.Smell = buff;
                    case 10: return sortedData.MovementSpeed = buff;
                    case 12: return sortedData.BlindingChance = buff;
                    case 13: return sortedData.DeafeningChance = buff;
                    case 14: return sortedData.BleedingChance = buff;
                    case 15: return sortedData.StunningChance = buff;
                    case 16: return sortedData.OdorlessBuff = buff;
                    case 18: return sortedData.SlowChance = buff;
                    case 19: return sortedData.BurningChance = buff;
                    case 22: return sortedData.SearchSpeed = buff;
                }
            });
        }
        else {
            // Injectors
            sortedData.Duration = (TotalTicks - 1) * ParseRawVaue(TimeBetweenTicks);

            HealthModifier = ParseRawVaue(HealthModifier) * TotalTicks;
            if(HealthModifier) sortedData.Health = HealthModifier;

            StaminaModifier = ParseRawVaue(StaminaModifier) * TotalTicks;
            if(StaminaModifier) sortedData.Stamina = StaminaModifier;
        }

        parsedData.push(sortedData);
    });
    // console.log(parsedData);
    return parsedData;
}

// Parse data files
function ParseConfigs(files, dataID, dataType) {
    let configs = files.find(x => x.Settings.Identifier.Guid.Value === dataID);
    if(!configs) return;

    let sortedData = {}

    switch(dataType) {
        // ConsumableTag
        case 1:
        // EnhancerTag
        case 2: {
            // console.log(configs);
            let { SatietyOnUse, ToxicityOnUse, HealthModifier, StaminaModifier, StopsBleeding, Buffs, Effects } = configs.Settings;

            if(SatietyOnUse) {
                SatietyOnUse = ParseRawVaue(SatietyOnUse);
                if(SatietyOnUse) sortedData.Satiety = SatietyOnUse;
            }

            if(ToxicityOnUse) {
                ToxicityOnUse = ParseRawVaue(ToxicityOnUse);
                if(ToxicityOnUse) sortedData.Toxicity = ToxicityOnUse;
            }
        
            if(HealthModifier) {
                HealthModifier = ParseRawVaue(HealthModifier);
                if(HealthModifier) sortedData.Health = HealthModifier;
            }
        
            if(StaminaModifier) {
                StaminaModifier = ParseRawVaue(StaminaModifier);
                if(StaminaModifier) sortedData.Stamina = StaminaModifier;
            }
            
            if(StopsBleeding) sortedData.StopsBleeding = StopsBleeding;
    
            if(Buffs) {
                if(Buffs[0]) sortedData.BuffsID = [ Buffs[0].Id.Value ];
            }
            else if(Effects) {
                if(Effects[0]) sortedData.BuffsID = [ Effects[0].Id.Value ];
            }
            break;
        }
        // FirearmTag
        case 3: {
            // console.log(configs);
            let { DamageMultiplier, RangeMultiplier, RecoilByConsecutiveBulletsShot, RoundsPerSecond, ReloadingTime, 
            MagazineCapacity, MovementSpeedMultiplier, DurabilityVariationOnShot } = configs.Settings;
            
            if(DamageMultiplier) {
                DamageMultiplier = ParseRawVaue(DamageMultiplier.RawValue) / 1000;
                if(DamageMultiplier) sortedData.Damage = DamageMultiplier;
            }
            if(RangeMultiplier) {
                RangeMultiplier = ParseRawVaue(RangeMultiplier.RawValue) / 1000;
                if(RangeMultiplier) sortedData.Range = RangeMultiplier;
            }
            if(RecoilByConsecutiveBulletsShot) {
                RecoilByConsecutiveBulletsShot = Math.round(ParseRawVaue(RecoilByConsecutiveBulletsShot[1]) * 1000);
                if(RecoilByConsecutiveBulletsShot) sortedData.Recoil = RecoilByConsecutiveBulletsShot;
            }
            if(RoundsPerSecond) {
                RoundsPerSecond = ParseRawVaue(RoundsPerSecond);
                if(RoundsPerSecond) sortedData.RoundsPerMinute = RoundsPerSecond * 60;
            }
            if(ReloadingTime) {
                ReloadingTime = ParseRawVaue(ReloadingTime);
                if(ReloadingTime) sortedData.ReloadingTime = ReloadingTime;
            }
            if(MagazineCapacity) sortedData.MagazineCapacity = MagazineCapacity;
            if(MovementSpeedMultiplier) {
                MovementSpeedMultiplier = ParseRawVaue(MovementSpeedMultiplier.RawValue) / 1000;
                if(MovementSpeedMultiplier) sortedData.MovementSpeed = MovementSpeedMultiplier;
            }    
            if(DurabilityVariationOnShot) sortedData.Durability = DurabilityVariationOnShot;
            break;
        }
        // MeleeTag
        case 4: {
            // console.log(configs);
            let { Damage, HitsPerSecond, CriticalDamageChanceMultiplier, StunningChanceMultiplier, BleedingChanceMultiplier, 
            MovementSpeedMultiplier, DurabilityVariationOnHit } = configs.Settings;

            if(Damage) {
                Damage = ParseRawVaue(Damage);
                if(Damage) sortedData.Damage = Damage;
            }
            if(HitsPerSecond) {
                HitsPerSecond = ParseRawVaue(HitsPerSecond) * 60;
                sortedData.DamagePerMinute = HitsPerSecond;
            }if(CriticalDamageChanceMultiplier) {
                CriticalDamageChanceMultiplier = ParseRawVaue(CriticalDamageChanceMultiplier.RawValue) / 1000;
                if(CriticalDamageChanceMultiplier) sortedData.CriticalChance = CriticalDamageChanceMultiplier;
            }
            if(StunningChanceMultiplier) {
                StunningChanceMultiplier = ParseRawVaue(StunningChanceMultiplier.RawValue) / 1000;
                if(StunningChanceMultiplier) sortedData.StunningChance = StunningChanceMultiplier;
            }
            if(BleedingChanceMultiplier) {
                BleedingChanceMultiplier = ParseRawVaue(BleedingChanceMultiplier.RawValue) / 1000;
                if(BleedingChanceMultiplier) sortedData.BleedingChance = BleedingChanceMultiplier;
            }
            if(MovementSpeedMultiplier) {
                MovementSpeedMultiplier = ParseRawVaue(MovementSpeedMultiplier.RawValue) / 1000;
                if(MovementSpeedMultiplier) sortedData.MovementSpeed = MovementSpeedMultiplier;
            }
            if(DurabilityVariationOnHit) sortedData.Durability = DurabilityVariationOnHit;
            break;
        }
        case 5: {
            // console.log(configs);
            let { TriggerDelay, EquipTime, ActivationTime, DamageByDistance, AreaOfEffectRadius, IsActivatedByDodge, StatBuffs, OnImpactStatBuffs, AoEStatBuffs,
            GeneratesBurningAreaForTooltipOnly, GeneratesSlowingAreaForTooltipOnly, GeneratesSmokingAreaForTooltipOnly, 
            MovementPreventedDuration, TriggerLengthForTooltipOnly, EffectOverTimeStatusForTooltipOnly } = configs.Settings;

            if(TriggerDelay) {
                TriggerDelay = ParseRawVaue(TriggerDelay);
                if(TriggerDelay) sortedData.TriggerDelay = TriggerDelay;
            }
            if(EquipTime) {
                EquipTime = ParseRawVaue(EquipTime);
                // Check if not throwable (they have EquipTime == 0.5)
                if(EquipTime && EquipTime != 0.5) sortedData.UseTime = EquipTime;
            }
            if(ActivationTime) {
                ActivationTime = ParseRawVaue(ActivationTime);
                if(ActivationTime) sortedData.TriggerDelay = ActivationTime;
            }
            if(DamageByDistance) {
                DamageByDistance = DamageByDistance.Samples.map(x => ParseRawVaue(x)); // Can be used for damage graphs
                if(DamageByDistance) {
                    sortedData.DamageByDistance = DamageByDistance;
                    if(DamageByDistance[0]) sortedData.Damage = DamageByDistance[0];
                }
            }
            if(AreaOfEffectRadius) {
                AreaOfEffectRadius = ParseRawVaue(AreaOfEffectRadius);
                if(AreaOfEffectRadius) {
                    if(StatBuffs) {
                        if(StatBuffs[0]) sortedData.EffectRadius = AreaOfEffectRadius;
                        sortedData.BuffsID = StatBuffs.map(buff => buff.StatBuffConfigAssetRef.Id.Value);
                    }
                    if(AoEStatBuffs) {
                        if(AoEStatBuffs[0]) sortedData.EffectRadius = AreaOfEffectRadius;
                        sortedData.BuffsID = AoEStatBuffs.map(buff => buff.StatBuffConfigAssetRef.Id.Value);
                    }
                    if(!sortedData.EffectRadius) sortedData.DamageRadius = AreaOfEffectRadius;
                }
            }
            if(IsActivatedByDodge != undefined) {
                if(IsActivatedByDodge == 0) sortedData.CanBeLeaped = 1;
            }
            if(OnImpactStatBuffs) {
                if(OnImpactStatBuffs[0]) {
                    sortedData.IsActivatedByImpact = 1;
                    sortedData.BuffsID = OnImpactStatBuffs.map(buff => buff.StatBuffConfigAssetRef.Id.Value);

                    if(EffectOverTimeStatusForTooltipOnly) {
                        let EffectOverTimeStatus = files.find(x => x.Settings.Identifier.Guid.Value === EffectOverTimeStatusForTooltipOnly.Id.Value);
                        sortedData.BuffsID.push(EffectOverTimeStatus.Settings.StatBuffs[0].StatBuffConfigAssetRef.Id.Value);
                    }
                }
            }
            if(GeneratesBurningAreaForTooltipOnly) sortedData.Creates = 0;
            if(GeneratesSlowingAreaForTooltipOnly) sortedData.Creates = 1;
            if(GeneratesSmokingAreaForTooltipOnly) sortedData.Creates = 2;
            if(MovementPreventedDuration) {
                MovementPreventedDuration = ParseRawVaue(MovementPreventedDuration);
                if(MovementPreventedDuration) sortedData.MovementPreventedDuration = MovementPreventedDuration;
            }
            if(TriggerLengthForTooltipOnly) {
                TriggerLengthForTooltipOnly = ParseRawVaue(TriggerLengthForTooltipOnly);
                if(TriggerLengthForTooltipOnly) sortedData.TriggerLength = TriggerLengthForTooltipOnly;
            }
            break;
        }
        case 6: {
            // console.log(configs);
            let { Bounces, NumberOfFragments, CriticalDamageChanceMultiplier, BlindingChanceMultiplier, DeafeningChanceMultiplier, BleedingChanceMultiplier, 
            StunningChanceMultiplier, BulletRotationSpeed, RecoilMultiplier, BulletSpeedMultiplier, RangeMultiplier, DamageMultiplier, 
            RequiredBloodPerDayWhenFarming } = configs.Settings;

            if(Bounces) sortedData.Bounces = Bounces;
            if(NumberOfFragments) sortedData.Fragments = NumberOfFragments;
            if(CriticalDamageChanceMultiplier) {
                CriticalDamageChanceMultiplier = ParseRawVaue(CriticalDamageChanceMultiplier.RawValue) / 1000;
                if(CriticalDamageChanceMultiplier) sortedData.CriticalChance = CriticalDamageChanceMultiplier;
            }
            if(BlindingChanceMultiplier) {
                BlindingChanceMultiplier = ParseRawVaue(BlindingChanceMultiplier.RawValue) / 1000;
                if(BlindingChanceMultiplier) sortedData.BlindingChance = BlindingChanceMultiplier;
            }
            if(DeafeningChanceMultiplier) {
                DeafeningChanceMultiplier = ParseRawVaue(DeafeningChanceMultiplier.RawValue) / 1000;
                if(DeafeningChanceMultiplier) sortedData.DeafeningChance = DeafeningChanceMultiplier;
            }
            if(BleedingChanceMultiplier) {
                BleedingChanceMultiplier = ParseRawVaue(BleedingChanceMultiplier.RawValue) / 1000;
                if(BleedingChanceMultiplier) sortedData.BleedingChance = BleedingChanceMultiplier;
            }
            if(StunningChanceMultiplier) {
                StunningChanceMultiplier = ParseRawVaue(StunningChanceMultiplier.RawValue) / 1000;
                if(StunningChanceMultiplier) sortedData.StunningChance = StunningChanceMultiplier;
            }
            if(BulletRotationSpeed) {
                BulletRotationSpeed = ParseRawVaue(BulletRotationSpeed);
                if(BulletRotationSpeed) sortedData.BulletRotationSpeed = BulletRotationSpeed;
            }
            if(RecoilMultiplier) {
                RecoilMultiplier = ParseRawVaue(RecoilMultiplier.RawValue) / 1000;
                if(RecoilMultiplier) sortedData.Recoil = RecoilMultiplier;
            }
            if(BulletSpeedMultiplier) {
                BulletSpeedMultiplier = ParseRawVaue(BulletSpeedMultiplier.RawValue) / 1000;
                if(BulletSpeedMultiplier) sortedData.BulletSpeed = BulletSpeedMultiplier;
            }
            if(RangeMultiplier) {
                RangeMultiplier = ParseRawVaue(RangeMultiplier.RawValue) / 1000;
                if(RangeMultiplier) sortedData.Range = RangeMultiplier;
            }
            if(DamageMultiplier) {
                DamageMultiplier = ParseRawVaue(DamageMultiplier.RawValue) / 1000;
                if(DamageMultiplier) sortedData.Damage = DamageMultiplier;
            }
            if(RequiredBloodPerDayWhenFarming) sortedData.BloodRequired = RequiredBloodPerDayWhenFarming; 
            break;
        }
        case 7: {
            // console.log(configs);
            let { Damage, Range, RequiredBloodPerDayWhenFarming, YieldWhenFarming } = configs.Settings;

            if(Damage) {
                Damage = ParseRawVaue(Damage);
                if(Damage) sortedData.Damage = Damage;
            }
            if(Range) {
                Range = ParseRawVaue(Range);
                if(Range) sortedData.Range = Range;
            }
            if(RequiredBloodPerDayWhenFarming) sortedData.BloodRequired = RequiredBloodPerDayWhenFarming;
            if(YieldWhenFarming) sortedData.Yield= YieldWhenFarming;
            break;
        }
    }
    return sortedData;
}

// x = x.RawValue / 65536
function ParseRawVaue(value) {
    let RawValue = value.RawValue;
    if(RawValue != undefined)
        return +(RawValue / 65536).toFixed(2);
    else
        return null;
}