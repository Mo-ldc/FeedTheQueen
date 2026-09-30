// Original costs, prerequisites and verbatim Chinese messages. Tab captions are intentionally preserved.
export const TAB_ORDER = [0,1,2,3,5,4,7,8,6,9,10,11,12,13,14];
export const UPGRADE_GROUPS = [
  {
    "title": "蚁后",
    "hint": "培育幼虫，建设蚁群的第一条生产线。",
    "items": [
      {
        "id": "queen_SpawnLarvae",
        "source": "queen/SpawnLarvae.tres",
        "title": "产下幼虫",
        "description": "消耗<color=#25bd49><b>食物</b></color>产下3只<color=#8453de><b>幼虫</b></color>，后者可蜕变为<color=#8453de><b>专业劳工</b></color>或<color=#8453de><b>设施</b></color>。<color=#8453de><b>幼虫</b></color>的成本会呈指数级增长。",
        "icon": "larva_1",
        "nutrients": [],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_LARVAE",
        "descriptionKey": "UPG_DESCRIPTION_LARVAE"
      },
      {
        "id": "queen_BuildingForagers",
        "source": "queen/BuildingForagers.tres",
        "title": "觅食者地洞",
        "description": "孵化<color=#8453de><b>觅食者地洞</b></color>。<br/><color=#8453de><b>觅食者</b></color>会在群落四周探索，寻找更多<color=#66a835><b>果丛</b></color>。",
        "icon": "units/antidle",
        "nutrients": [
          20
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [
          "queen/SpawnLarvae.tres"
        ],
        "titleKey": "BUILDING_NAME_FORAGERS",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_FORAGERS"
      },
      {
        "id": "queen_BuildingHaulers",
        "source": "queen/BuildingHaulers.tres",
        "title": "搬运工巢房",
        "description": "孵化<color=#8453de><b>搬运工巢房</b></color>。<br/><color=#8453de><b>搬运工</b></color>负责在群落中搬运食物，并将其送达<color=#8453de><b>蚁后</b></color>。",
        "icon": "units/ant_carrying",
        "nutrients": [
          50
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [
          "queen/BuildingForagers.tres"
        ],
        "titleKey": "BUILDING_NAME_HAULERS_BASE",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_HAULERS"
      },
      {
        "id": "queen_BuildingEvolutionChamber",
        "source": "queen/BuildingEvolutionChamber.tres",
        "title": "进化腔",
        "description": "孵化<color=#8453de><b>进化腔</b></color>，提升群落的认知能力。<br/>解锁高级设施与升级。",
        "icon": "icons/dna",
        "nutrients": [
          200
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [
          "queen/BuildingHaulers.tres"
        ],
        "titleKey": "BUILDING_NAME_EVOLUTION",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_EVOLUTION"
      },
      {
        "id": "queen_Nursery",
        "source": "queen/Nursery.tres",
        "title": "蜂王浆",
        "description": "产下8只<color=#8453de><b>幼虫</b></color>，且每升一级都会额外产下2只<color=#8453de><b>蚁后</b></color>（具有追溯效力）。",
        "icon": "larva_1",
        "nutrients": [
          10000
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [
          "queen/BuildingEvolutionChamber.tres"
        ],
        "titleKey": "UPG_TITLE_NURSING",
        "descriptionKey": "UPG_DESCRIPTION_NURSING"
      },
      {
        "id": "queen_AffinityHeat",
        "source": "queen/AffinityHeat.tres",
        "title": "酷热亲和",
        "description": "<color=#e84d00><b>辛辣食物</b></color>额外提供1层<color=#e84d00><b>酷热</b></color>。<br/><color=#b46f3c><b>烈焰冰淇淋</b></color>额外提供1层<color=#b467cb><b>霜燃</b></color>。",
        "icon": "foods/pepper",
        "nutrients": [
          50000,
          500000,
          5000000,
          50000000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "queen/BuildingEvolutionChamber.tres"
        ],
        "titleKey": "UPG_TITLE_AFFINITY_HEAT",
        "descriptionKey": "UPG_DESCRIPTION_AFFINITY_HEAT"
      },
      {
        "id": "queen_AffinityCold",
        "source": "queen/AffinityCold.tres",
        "title": "严寒亲和",
        "description": "<color=#25cee4><b>严寒</b></color>使额外<color=#1c84ff><b>倍率</b></color>提升0.1。",
        "icon": "foods/iceberry",
        "nutrients": [
          3000,
          7000,
          20000,
          70000,
          200000,
          300000,
          500000,
          700000,
          1000000,
          1500000,
          3000000,
          15000000,
          50000000,
          100000000,
          250000000,
          500000000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "orchard/IceBerries.tres"
        ],
        "titleKey": "UPG_TITLE_AFFINITY_COLD",
        "descriptionKey": "UPG_DESCRIPTION_AFFINITY_COLD"
      },
      {
        "id": "queen_Rebirth",
        "source": "queen/Rebirth.tres",
        "title": "浴火重生",
        "description": "将所有<color=#8453de><b>觅食者</b></color>、<color=#8453de><b>搬运工</b></color>、<color=#8453de><b>投掷者</b></color>、<color=#8453de><b>陷阱猎手</b></color>、<color=#8453de><b>王牌猎人</b></color>、<color=#8453de><b>掘地工</b></color>和<color=#8453de><b>真菌学家</b></color>全数退化回<color=#8453de><b>幼虫</b></color>。",
        "icon": "icons/dna",
        "nutrients": [
          100000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_REBIRTH",
        "descriptionKey": "UPG_DESCRIPTION_REBIRTH"
      }
    ]
  },
  {
    "title": "觅食者",
    "hint": "孵化觅食者，扩充野外食物供给。",
    "items": [
      {
        "id": "foragers_SpawnForager",
        "source": "foragers/SpawnForager.tres",
        "title": "孵化觅食者",
        "description": "孵化<color=#8453de><b>觅食者</b></color>。<br/><color=#8453de><b>觅食者</b></color>会在四周探索并寻找<color=#66a835><b>果丛</b></color>。<br/>每15秒就能发现一丛长有3颗果实的<color=#66a835><b>果丛</b></color>。<br/><color=#8453de><b>觅食者</b></color>必须守着这丛<color=#66a835><b>果丛</b></color>，直到采摘完毕，才会去寻找下一丛。",
        "icon": "units/antidle",
        "nutrients": [],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_HATCH_FORAGER",
        "descriptionKey": "UPG_DESCRIPTION_HATCH_FORAGER"
      },
      {
        "id": "foragers_BiggerPiles",
        "source": "foragers/BiggerPiles.tres",
        "title": "硕大果丛",
        "description": "<color=#8453de><b>觅食者</b></color>发现的<color=#66a835><b>果丛</b></color>额外带有1颗果实。",
        "icon": "foods/blueberry",
        "nutrients": [
          5,
          10,
          17,
          26,
          37,
          50,
          120,
          250,
          700,
          1200,
          2700,
          4100,
          7500,
          12000,
          25000,
          45000,
          70000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_BIGGER_BUSHES",
        "descriptionKey": "UPG_DESCRIPTION_BIGGER_BUSHES"
      },
      {
        "id": "foragers_FasterDiscovery",
        "source": "foragers/FasterDiscovery.tres",
        "title": "敏锐感官",
        "description": "<color=#8453de><b>觅食者</b></color>发现<color=#66a835><b>果丛</b></color>的速度加快1秒。",
        "icon": "units/forager_head",
        "nutrients": [
          90,
          280,
          1700,
          3500,
          16000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "foragers/SpawnForager.tres"
        ],
        "titleKey": "UPG_TITLE_ACCUTE_SENSES",
        "descriptionKey": "UPG_DESCRIPTION_ACCUTE_SENSES"
      },
      {
        "id": "foragers_Multitasking",
        "source": "foragers/Multitasking.tres",
        "title": "多线操作",
        "description": "<color=#8453de><b>觅食者</b></color>能同时留意多丛<color=#66a835><b>果丛</b></color>，即使先前发现的<color=#66a835><b>果丛</b></color>还没采完也能继续觅食。<br/>追踪的<color=#66a835><b>果丛</b></color>上限+1。",
        "icon": "units/antidle",
        "nutrients": [
          20,
          1000,
          500000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "foragers/SpawnForager.tres"
        ],
        "titleKey": "UPG_TITLE_MULTITASKING",
        "descriptionKey": "UPG_DESCRIPTION_MULTITASKING"
      },
      {
        "id": "foragers_ExtraBush",
        "source": "foragers/ExtraBush.tres",
        "title": "意外之喜",
        "description": "一丛<color=#66a835><b>果丛</b></color>背后可能还藏着另一丛！<br/><color=#8453de><b>觅食者</b></color>发现额外<color=#66a835><b>果丛</b></color>的概率提升10%。",
        "icon": "foods/blueberry",
        "nutrients": [
          40,
          200,
          800,
          2000,
          8000,
          20000,
          80000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "queen/BuildingEvolutionChamber.tres",
          "foragers/SpawnForager.tres"
        ],
        "titleKey": "UPG_TITLE_LUCKY_SPOT",
        "descriptionKey": "UPG_DESCRIPTION_LUCKY_SPOT"
      },
      {
        "id": "foragers_ComboUnlock",
        "source": "foragers/ComboUnlock.tres",
        "title": "大丰收",
        "description": "额外的<color=#66a835><b>果丛</b></color>背后可能还藏着更多，层层套娃！<br/>“意外之喜”效果也适用于被该效果发现的额外<color=#66a835><b>果丛</b></color>！",
        "icon": "foods/blueberry",
        "nutrients": [
          0
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [
          "foragers/ExtraBush.tres"
        ],
        "titleKey": "UPG_TITLE_LUCKY_COMBO",
        "descriptionKey": "UPG_DESCRIPTION_LUCKY_COMBO"
      },
      {
        "id": "foragers_ComboPiles",
        "source": "foragers/ComboPiles.tres",
        "title": "层层递进",
        "description": "单次触发“大丰收”时可发现的额外<color=#66a835><b>果丛</b></color>数量上限+1。",
        "icon": "foods/blueberry",
        "nutrients": [
          50,
          200,
          1000,
          4000,
          8000,
          13000,
          25000,
          250000,
          2500000,
          25000000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "foragers/ComboUnlock.tres"
        ],
        "titleKey": "UPG_TITLE_NO_CEILING",
        "descriptionKey": "UPG_DESCRIPTION_NO_CEILING"
      },
      {
        "id": "foragers_ApplesForaging",
        "source": "foragers/ApplesForaging.tres",
        "title": "野生苹果",
        "description": "<color=#8453de><b>觅食者</b></color>改为寻找<color=#dd1533><b>苹果</b></color>。<br/><color=#dd1533><b>苹果</b></color><color=#66a835><b>果丛</b></color>的果实数量减少为原本的五分之一。",
        "icon": "foods/red_apple",
        "nutrients": [
          15000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "evolution/BuildingOrchard.tres",
          "foragers/SpawnForager.tres"
        ],
        "titleKey": "UPG_TITLE_APPLES_FORAGING",
        "descriptionKey": "UPG_DESCRIPTION_APPLES_FORAGING"
      },
      {
        "id": "foragers_CitrusForaging",
        "source": "foragers/CitrusForaging.tres",
        "title": "酸甜交织",
        "description": "<color=#8453de><b>觅食者</b></color>改为寻找<color=#5f7f1e><b>柑橘</b></color>。<br/><color=#5f7f1e><b>柑橘</b></color><color=#66a835><b>果丛</b></color>的果实数量减半。",
        "icon": "units/antidle",
        "nutrients": [
          1000000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "evolution/BuildingCuisine.tres",
          "foragers/SpawnForager.tres"
        ],
        "titleKey": "UPG_TITLE_CITRUS_FORAGING",
        "descriptionKey": "UPG_DESCRIPTION_CITRUS_FORAGING"
      },
      {
        "id": "foragers_RainbowPiles",
        "source": "foragers/RainbowPiles.tres",
        "title": "彩虹大道",
        "description": "每当<color=#8453de><b>觅食者</b></color>触发包含3丛<color=#66a835><b>果丛</b></color>以上的“大丰收”时，这些<color=#66a835><b>果丛</b></color>上的所有果实都会自动送达目的地！",
        "icon": "units/antidle",
        "nutrients": [
          0
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [
          "foragers/ComboUnlock.tres"
        ],
        "titleKey": "UPG_TITLE_RAINBOW_ROAD",
        "descriptionKey": "UPG_DESCRIPTION_RAINBOW_ROAD"
      }
    ]
  },
  {
    "title": "搬运工(西)",
    "hint": "提升运输效率，让食物更快送达蚁后。",
    "items": [
      {
        "id": "haulers_SpawnHauler",
        "source": "haulers/SpawnHauler.tres",
        "title": "孵化搬运工",
        "description": "孵化<color=#8453de><b>搬运工</b></color>。<br/><color=#8453de><b>搬运工</b></color>负责将群落产出的食物运送到<color=#8453de><b>蚁后</b></color>。<br/><color=#8453de><b>搬运工</b></color>的基础移动速度为200点。",
        "icon": "units/ant_carrying",
        "nutrients": [],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_HATCH_HAULER",
        "descriptionKey": "UPG_DESCRIPTION_HATCH_HAULER"
      },
      {
        "id": "haulers_HaulerSpeed",
        "source": "haulers/HaulerSpeed.tres",
        "title": "干劲满满",
        "description": "提升<color=#8453de><b>搬运工</b></color>20点移动速度。",
        "icon": "units/antidle",
        "nutrients": [
          10,
          30,
          50,
          120,
          405,
          900,
          2200,
          4000,
          9000,
          12000,
          25000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "haulers/SpawnHauler.tres"
        ],
        "titleKey": "UPG_TITLE_HAULER_SPEED",
        "descriptionKey": "UPG_DESCRIPTION_HAULER_SPEED"
      },
      {
        "id": "haulers_HaulerCapacity",
        "source": "haulers/HaulerCapacity.tres",
        "title": "强韧力量",
        "description": "<color=#8453de><b>搬运工</b></color>能额外搬运一份食物。",
        "icon": "foods/blueberry",
        "nutrients": [
          25,
          50,
          400,
          5000,
          28000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "haulers/SpawnHauler.tres"
        ],
        "titleKey": "UPG_TITLE_STRENGTH",
        "descriptionKey": "UPG_DESCRIPTION_STRENGTH"
      },
      {
        "id": "haulers_CarrierClosest",
        "source": "haulers/CarrierClosest.tres",
        "title": "见机行事",
        "description": "<color=#8453de><b>负责运送食物的劳工</b></color>可能会优先前往距离最近的食物来源。",
        "icon": "units/ant_carrying",
        "nutrients": [
          400
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "queen/BuildingEvolutionChamber.tres"
        ],
        "titleKey": "UPG_TITLE_OPPORTUNISM",
        "descriptionKey": "UPG_DESCRIPTION_OPPORTUNISM"
      },
      {
        "id": "haulers_HaulerCapacityHerculean",
        "source": "haulers/HaulerCapacityHerculean.tres",
        "title": "大力神",
        "description": "<color=#8453de><b>搬运工</b></color>能额外搬运一份食物，但移动速度降低20点。",
        "icon": "units/antidle",
        "nutrients": [
          50000,
          300000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "haulers/SpawnHauler.tres"
        ],
        "titleKey": "SPECIALISATION_TITLE_HERCULEAN",
        "descriptionKey": "UPG_DESCRIPTION_STRENGTH_HERCULEAN"
      },
      {
        "id": "haulers_Sprint",
        "source": "haulers/Sprint.tres",
        "title": "闪电突进",
        "description": "在搬运1到3份食物时，<color=#8453de><b>搬运工</b></color>会进入冲刺状态，移动速度提升至4倍。",
        "icon": "units/antidle",
        "nutrients": [
          0
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [
          "queen/BuildingEvolutionChamber.tres"
        ],
        "titleKey": "UPG_TITLE_SPRINT",
        "descriptionKey": "UPG_DESCRIPTION_SPRINT"
      },
      {
        "id": "haulers_HotPotato",
        "source": "haulers/HotPotato.tres",
        "title": "烫手山芋",
        "description": "<color=#8453de><b>搬运工</b></color>在运送<color=#e84d00><b>辛辣食物</b></color>时，移动速度提升50点，投掷速度提升至3倍，持续30秒。",
        "icon": "units/antidle",
        "nutrients": [
          0
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [
          "queen/BuildingEvolutionChamber.tres"
        ],
        "titleKey": "UPG_TITLE_HOT_POTATO",
        "descriptionKey": "UPG_DESCRIPTION_HOT_POTATO"
      },
      {
        "id": "haulers_CarrierSmallest",
        "source": "haulers/CarrierSmallest.tres",
        "title": "清理库存",
        "description": "<color=#8453de><b>负责运送食物的劳工</b></color>可能会优先前往食物储量最少的食物来源。",
        "icon": "units/ant_carrying",
        "nutrients": [
          6000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "evolution/BuildingHunters.tres"
        ],
        "titleKey": "UPG_TITLE_CLEAN_UP",
        "descriptionKey": "UPG_DESCRIPTION_CLEAN_UP"
      }
    ]
  },
  {
    "title": "进化腔",
    "hint": "认知成长，解锁新的食物来源。",
    "items": [
      {
        "id": "evolution_BuildingOrchard",
        "source": "evolution/BuildingOrchard.tres",
        "title": "果园",
        "description": "孵化<color=#8453de><b>果园</b></color>，<color=#8453de><b>树艺师</b></color>会在此照料<color=#66a835><b>果树</b></color>并采摘果实。",
        "icon": "buildings/Bulb",
        "nutrients": [
          700
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "BUILDING_NAME_ORCHARD",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_ORCHARD"
      },
      {
        "id": "evolution_Calcul",
        "source": "evolution/Calcul.tres",
        "title": "心算",
        "description": "利用有机物质的弹性来额外孵化<color=#ff9898><b>脑灰质</b></color>。",
        "icon": "icons/brain",
        "nutrients": [
          314000
        ],
        "larvae": 2,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "SPECIALISATION_TITLE_EXTRA",
        "descriptionKey": "UPG_DESCRIPTION_CALCULUS"
      },
      {
        "id": "evolution_BuildingFarm",
        "source": "evolution/BuildingFarm.tres",
        "title": "农场",
        "description": "建造<color=#8453de><b>农场</b></color>并孵化<color=#8453de><b>挤奶工</b></color>，负责挤取驯养<color=#85c849><b>蚜虫</b></color>的奶汁。",
        "icon": "buildings/Farm",
        "nutrients": [
          200
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "BUILDING_NAME_FARM",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_FARM"
      },
      {
        "id": "evolution_BuildingMushrooms",
        "source": "evolution/BuildingMushrooms.tres",
        "title": "蘑菇实验室",
        "description": "孵化<color=#8453de><b>蘑菇实验室</b></color>，<color=#8453de><b>真菌学家</b></color>会在此研究具有<color=#9471bf><b>神奇功效</b></color>的<color=#6c4838><b>蘑菇</b></color>。",
        "icon": "buildings/Lab",
        "nutrients": [
          1000000
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "BUILDING_NAME_MUSHROOMS",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_MUSHROOMS"
      },
      {
        "id": "evolution_BuildingThrowers",
        "source": "evolution/BuildingThrowers.tres",
        "title": "投掷者洞窟",
        "description": "孵化<color=#8453de><b>投掷者洞窟</b></color>。<br/><color=#8453de><b>投掷者</b></color>能将食物扔到极远的地方。",
        "icon": "buildings/Den",
        "nutrients": [
          300
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "BUILDING_NAME_THROWERS",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_THROWERS"
      },
      {
        "id": "evolution_BuildingHunters",
        "source": "evolution/BuildingHunters.tres",
        "title": "陷阱工坊",
        "description": "孵化<color=#8453de><b>陷阱工坊</b></color>，为<color=#8453de><b>陷阱猎手</b></color>提供狩猎<color=#ea85fd><b>野生动物</b></color>的<color=#5f6162><b>必要手段</b></color>。",
        "icon": "buildings/Factory",
        "nutrients": [
          2000
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "BUILDING_NAME_HUNTERS",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_HUNTERS"
      },
      {
        "id": "evolution_BuildingGemini",
        "source": "evolution/BuildingGemini.tres",
        "title": "双子星",
        "description": "孵化<color=#8453de><b>搬运工巢房（东）</b></color>，提供另一个容纳和管理<color=#8453de><b>搬运工</b></color>的场所。",
        "icon": "units/antidle",
        "nutrients": [
          200
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [
          "queen/BuildingHaulers.tres"
        ],
        "titleKey": "SPECIALISATION_TITLE_GEMINI",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_HAULERS_GEMINI"
      },
      {
        "id": "evolution_BuildingCuisine",
        "source": "evolution/BuildingCuisine.tres",
        "title": "厨房",
        "description": "建造<color=#8453de><b>厨房</b></color>并孵化<color=#8453de><b>主厨</b></color>。<br/>可在<color=#8453de><b>厨房</b></color>研究各类食谱，将精选食材融合成美味佳肴。",
        "icon": "units/antidle",
        "nutrients": [
          500000
        ],
        "larvae": 1,
        "greyMatter": 1,
        "prerequisites": [],
        "titleKey": "BUILDING_NAME_CUISINE",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_CUISINE"
      },
      {
        "id": "evolution_BuildingMine",
        "source": "evolution/BuildingMine.tres",
        "title": "矿场",
        "description": "建造<color=#8453de><b>矿场</b></color>。<br/><color=#8453de><b>矿工</b></color>会前往地底深处探索，开采各类稀有矿物与材料来强化群落。",
        "icon": "units/antidle",
        "nutrients": [
          1000000000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "BUILDING_NAME_MINE",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_MINE"
      },
      {
        "id": "evolution_BuildingFishing",
        "source": "evolution/BuildingFishing.tres",
        "title": "渔场",
        "description": "建造<color=#8453de><b>渔场</b></color>并配备<color=#8453de><b>船员</b></color>。<br/><color=#8453de><b>渔船</b></color>会在湖面航行，捕捞美味的水生生物，提供诱饵还能提升捕捞速度与产量。",
        "icon": "units/antidle",
        "nutrients": [
          10000000
        ],
        "larvae": 4,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "BUILDING_NAME_FISHING",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_FISHING"
      },
      {
        "id": "evolution_BuildingTunnellers",
        "source": "evolution/BuildingTunnellers.tres",
        "title": "隧道网络",
        "description": "孵化<color=#8453de><b>隧道网络</b></color>。<br/><color=#8453de><b>掘地工</b></color>会挖掘地下隧道，极高效率地在两地之间运输食物。",
        "icon": "units/antidle",
        "nutrients": [
          500000
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "BUILDING_NAME_TUNNELLERS",
        "descriptionKey": "UPG_DESCRIPTION_BUILDING_TUNNELLERS"
      }
    ]
  },
  {
    "title": "果园",
    "hint": "树木生长、采收与味觉调配。",
    "items": [
      {
        "id": "orchard_MoreTrees",
        "source": "orchard/MoreTrees.tres",
        "title": "种植树木",
        "description": "孵化一对<color=#8453de><b>树艺师</b></color>来种下并悉心照料新的<color=#66a835><b>果树</b></color>。<br/><color=#66a835><b>果树</b></color>每15秒会结出果实。",
        "icon": "buildings/Tree",
        "nutrients": [
          30,
          160,
          340,
          1100,
          2400,
          4000,
          10500,
          35000,
          61000
        ],
        "larvae": 2,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_HATCH_ARBORIST",
        "descriptionKey": "UPG_DESCRIPTION_HATCH_ARBORIST"
      },
      {
        "id": "orchard_MoreTreesExtra",
        "source": "orchard/MoreTreesExtra.tres",
        "title": "森林之女",
        "description": "孵化一对<color=#8453de><b>树艺师</b></color>来种下并悉心照料新的<color=#66a835><b>果树</b></color>。<br/><color=#66a835><b>果树</b></color>每15秒会结出果实。",
        "icon": "buildings/Tree",
        "nutrients": [
          500000,
          1000000,
          5000000
        ],
        "larvae": 2,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "SPECIALISATION_TITLE_FOREST",
        "descriptionKey": "UPG_DESCRIPTION_HATCH_ARBORIST"
      },
      {
        "id": "orchard_Prolificity",
        "source": "orchard/Prolificity.tres",
        "title": "硕果累累",
        "description": "<color=#66a835><b>果树</b></color>额外结出1颗果实。",
        "icon": "foods/red_apple",
        "nutrients": [
          5,
          50,
          500,
          5000,
          50000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "orchard/MoreTrees.tres"
        ],
        "titleKey": "UPG_TITLE_PROLIFICITY",
        "descriptionKey": "UPG_DESCRIPTION_PROLIFICITY"
      },
      {
        "id": "orchard_GrowthSpeed",
        "source": "orchard/GrowthSpeed.tres",
        "title": "丰饶之土",
        "description": "<color=#66a835><b>果树</b></color>结果速度加快1秒。",
        "icon": "buildings/Tree",
        "nutrients": [
          120,
          230,
          405,
          640,
          920,
          1200,
          7500,
          12000,
          30000,
          70000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "orchard/MoreTrees.tres"
        ],
        "titleKey": "UPG_TITLE_FERTILITY",
        "descriptionKey": "UPG_DESCRIPTION_FERTILITY"
      },
      {
        "id": "orchard_ApplesValue",
        "source": "orchard/ApplesValue.tres",
        "title": "美味苹果",
        "description": "所有<color=#dd1533><b>苹果</b></color>获得3点<color=#25bd49><b>食物</b></color>。",
        "icon": "foods/red_apple",
        "nutrients": [
          50,
          90,
          130,
          250,
          450,
          860,
          1400,
          1750,
          2400,
          3500
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_YUMMY_APPLES",
        "descriptionKey": "UPG_DESCRIPTION_YUMMY_APPLES"
      },
      {
        "id": "orchard_GoldenApples",
        "source": "orchard/GoldenApples.tres",
        "title": "恩赐",
        "description": "<color=#8453de><b>果园</b></color>里结出<color=#dd1533><b>苹果</b></color>的有1%的概率变成<color=#edaf3b><b>金苹果</b></color>。<br/><color=#edaf3b><b>金苹果</b></color>的<color=#25bd49><b>食物</b></color>价值是<color=#dd1533><b>苹果</b></color>的10倍，且会直接送达目的地。",
        "icon": "foods/golden_apple",
        "nutrients": [
          777
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "orchard/ApplesValue.tres"
        ],
        "titleKey": "UPG_TITLE_BLESSING",
        "descriptionKey": "UPG_DESCRIPTION_BLESSING"
      },
      {
        "id": "orchard_ScorchFruits",
        "source": "orchard/ScorchFruits.tres",
        "title": "火辣热情",
        "description": "<color=#66a835><b>果树</b></color>可能会改为产出<color=#e84d00><b>辣椒</b></color>。",
        "icon": "foods/pepper",
        "nutrients": [
          3000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "orchard/MoreTrees.tres"
        ],
        "titleKey": "UPG_TITLE_HOT_PEPPERS",
        "descriptionKey": "UPG_DESCRIPTION_HOT_PEPPERS"
      },
      {
        "id": "orchard_IceBerries",
        "source": "orchard/IceBerries.tres",
        "title": "极寒刺骨",
        "description": "<color=#66a835><b>果树</b></color>可能会改为产出<color=#25cee4><b>冰寒莓果</b></color>。",
        "icon": "foods/iceberry",
        "nutrients": [
          9000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "orchard/MoreTrees.tres"
        ],
        "titleKey": "UPG_TITLE_ICE_BERRIES",
        "descriptionKey": "UPG_DESCRIPTION_ICE_BERRIES"
      },
      {
        "id": "orchard_Plenty",
        "source": "orchard/Plenty.tres",
        "title": "多产结实",
        "description": "<color=#66a835><b>果树</b></color>额外结出2颗果实。",
        "icon": "foods/red_apple",
        "nutrients": [
          0
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [
          "orchard/Prolificity.tres"
        ],
        "titleKey": "UPG_TITLE_PLENTY",
        "descriptionKey": "UPG_DESCRIPTION_PLENTY"
      },
      {
        "id": "orchard_STOMP",
        "source": "orchard/STOMP.tres",
        "title": "重踏",
        "description": "<color=#8453de><b>树艺师</b></color>跳得更高，落地冲击力更强，能把果实一路震飞到目的地！",
        "icon": "units/tall",
        "nutrients": [
          0
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [
          "orchard/MoreTrees.tres"
        ],
        "titleKey": "UPG_TITLE_STOMP",
        "descriptionKey": "UPG_DESCRIPTION_STOMP"
      }
    ]
  },
  {
    "title": "农场",
    "hint": "挤奶工轮流采收蚜虫，搬运工负责送餐。",
    "items": [
      {
        "id": "farm_MoreBugs",
        "source": "farm/MoreBugs.tres",
        "title": "更多蚜虫",
        "description": "捕获新<color=#85c849><b>蚜虫</b></color>并将其加入<color=#8453de><b>农场</b></color>的牧场。每10秒会挤一次<color=#85c849><b>蚜虫</b></color>的奶。<br/><color=#e59a34><b>黏性蚜虫</b></color>会产出<color=#e59a34><b>蜜露</b></color>。",
        "icon": "units/aphid_honey",
        "nutrients": [
          70,
          160,
          410,
          800,
          2200,
          6100,
          20400,
          51000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_APHIDS",
        "descriptionKey": "UPG_DESCRIPTION_APHIDS"
      },
      {
        "id": "farm_BugProduction",
        "source": "farm/BugProduction.tres",
        "title": "孵化农夫",
        "description": "孵化<color=#8453de><b>农夫</b></color>。<br/><color=#8453de><b>农夫</b></color>负责放牧<color=#85c849><b>蚜虫</b></color>，让其感到安全愉悦，从而使产奶量+1。",
        "icon": "units/farmer",
        "nutrients": [
          400,
          1200,
          2800,
          7000,
          14000,
          24000,
          45000,
          82000,
          150000
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_FARMER",
        "descriptionKey": "UPG_DESCRIPTION_FARMER"
      },
      {
        "id": "farm_FireBugs",
        "source": "farm/FireBugs.tres",
        "title": "火焰蚜虫",
        "description": "<color=#e59a34><b>黏性蚜虫</b></color>可替换为<color=#c12d00><b>火焰蚜虫</b></color>，能产出<color=#c12d00><b>辣酱</b></color>。",
        "icon": "units/aphid_spicy",
        "nutrients": [
          1000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_FIRE_APHIDS",
        "descriptionKey": "UPG_DESCRIPTION_FIRE_APHIDS"
      },
      {
        "id": "farm_MeatBugs",
        "source": "farm/MeatBugs.tres",
        "title": "肉食蚜虫",
        "description": "<color=#e59a34><b>黏性蚜虫</b></color>可替换为<color=#ea85fd><b>肉食蚜虫</b></color>，能产出<color=#ea85fd><b>肉丸</b></color>，但食物产出量只有其他种类<color=#85c849><b>蚜虫</b></color>的一半。",
        "icon": "units/aphid_meat",
        "nutrients": [
          10000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_MEAT_APHIDS",
        "descriptionKey": "UPG_DESCRIPTION_MEAT_APHIDS"
      },
      {
        "id": "farm_DoubleGlaze",
        "source": "farm/DoubleGlaze.tres",
        "title": "双重糖霜",
        "description": "<color=#e59a34><b>黏性蚜虫</b></color>的<color=#e59a34><b>蜜露</b></color>产出量翻倍。<br/>此效果不影响其他种类的<color=#85c849><b>蚜虫</b></color>。",
        "icon": "foods/honeydew",
        "nutrients": [
          0
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [
          "farm/MoreBugs.tres"
        ],
        "titleKey": "UPG_TITLE_DOUBLE_GLAZE",
        "descriptionKey": "UPG_DESCRIPTION_DOUBLE_GLAZE"
      },
      {
        "id": "farm_Shiny",
        "source": "farm/Shiny.tres",
        "title": "闪闪发光",
        "description": "一只<color=#85c849><b>蚜虫</b></color>会变成<color=#398ca4><b>闪光蚜虫</b></color>，除了常规产出外还会额外产出一颗<color=#398ca4><b>珍珠</b></color>。",
        "icon": "foods/pearl",
        "nutrients": [
          0
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_SHINY",
        "descriptionKey": "UPG_DESCRIPTION_SHINY"
      }
    ]
  },
  {
    "title": "蘑菇实验室",
    "hint": "每种孢子需要6名菌类学家维持完整效果，可同时启用多种。",
    "items": [
      {
        "id": "mushrooms_SpawnMycologist",
        "source": "mushrooms/SpawnMycologist.tres",
        "title": "孵化真菌学家",
        "description": "孵化<color=#8453de><b>真菌学家</b></color>。<br/><color=#8453de><b>真菌学家</b></color>会深入森林，每6秒采集1朵<color=#6c4838><b>蘑菇</b></color>。<color=#6c4838><b>蘑菇</b></color>会被送往<color=#8453de><b>实验室</b></color>转化为<color=#9471bf><b>孢子</b></color>。<br/><color=#8453de><b>真菌学家</b></color>会平均采摘所有已启用的<color=#6c4838><b>蘑菇</b></color>，最高可提供100%<color=#9471bf><b>孢子</b></color>效率。",
        "icon": "units/sluggy",
        "nutrients": [],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_HATCH_MYCOLOGIST",
        "descriptionKey": "UPG_DESCRIPTION_HATCH_MYCOLOGIST"
      },
      {
        "id": "mushrooms_SporesFocus",
        "source": "mushrooms/SporesFocus.tres",
        "title": "凝神菇",
        "description": "采摘凝神菇并转化为<color=#9471bf><b>孢子</b></color>，提升<color=#8453de><b>搬运工</b></color>和<color=#8453de><b>投掷者</b></color>的精准度。",
        "icon": "foods/bolet",
        "nutrients": [
          300000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "NAME_SHROOM_FOCUS",
        "descriptionKey": "UPG_DESCRIPTION_SPORES_FOCUS"
      },
      {
        "id": "mushrooms_SporesEuphoria",
        "source": "mushrooms/SporesEuphoria.tres",
        "title": "极乐菇",
        "description": "采摘极乐菇并转化为<color=#9471bf><b>孢子</b></color>，提升<color=#8453de><b>搬运工</b></color>和<color=#8453de><b>投掷者</b></color>的灵敏度。",
        "icon": "foods/amanita",
        "nutrients": [
          300000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "NAME_SHROOM_EUPHORIA",
        "descriptionKey": "UPG_DESCRIPTION_SPORES_EUPHORIA"
      },
      {
        "id": "mushrooms_SporesVitamins",
        "source": "mushrooms/SporesVitamins.tres",
        "title": "繁茂菇",
        "description": "采摘繁茂菇并转化为<color=#9471bf><b>孢子</b></color>，提升所有产出食物的基础品质。",
        "icon": "foods/starshroom",
        "nutrients": [
          300000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "NAME_SHROOM_VERDANT",
        "descriptionKey": "UPG_DESCRIPTION_SPORES_VERDANT"
      },
      {
        "id": "mushrooms_SporesPurification",
        "source": "mushrooms/SporesPurification.tres",
        "title": "澄澈菇",
        "description": "采摘澄澈菇并转化为<color=#9471bf><b>孢子</b></color>，提升<color=#8453de><b>蚁后</b></color>处理营养物质的能力。",
        "icon": "foods/clearshroom",
        "nutrients": [
          300000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "NAME_SHROOM_CLEAR",
        "descriptionKey": "UPG_DESCRIPTION_SPORES_CLEAR"
      },
      {
        "id": "mushrooms_Chanterelles",
        "source": "mushrooms/Chanterelles.tres",
        "title": "鸡油菌",
        "description": "当所有已启用的<color=#9471bf><b>孢子</b></color>达到上限时，多余的<color=#8453de><b>真菌学家</b></color>不会小睡，而会去采摘<color=#c29227><b>鸡油菌</b></color>。",
        "icon": "foods/chanterelle",
        "nutrients": [
          1000000
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [],
        "titleKey": "NAME_FOOD_CHANTERELLE",
        "descriptionKey": "UPG_DESCRIPTION_CHANTERELLES"
      },
      {
        "id": "mushrooms_SpawnHandler",
        "source": "mushrooms/SpawnHandler.tres",
        "title": "孵化实验员",
        "description": "在<color=#8453de><b>实验室</b></color>中孵化<color=#8453de><b>实验员</b></color>，负责处理<color=#c29227><b>鸡油菌</b></color>以大幅提升其品质。<br/>每多出一名<color=#8453de><b>实验员</b></color>，<color=#c29227><b>鸡油菌</b></color>提供的<color=#b46f3c><b>鲜味</b></color>层数就+1。",
        "icon": "foods/chanterelle",
        "nutrients": [],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [
          "mushrooms/Chanterelles.tres"
        ],
        "titleKey": "UPG_TITLE_HANDLERS",
        "descriptionKey": "UPG_DESCRIPTION_HANDLERS"
      }
    ]
  },
  {
    "title": "投掷者",
    "hint": "每批最多取20份，原地远投；累计50份后休息。",
    "items": [
      {
        "id": "throwers_SpawnThrower",
        "source": "throwers/SpawnThrower.tres",
        "title": "孵化投掷者",
        "description": "孵化<color=#8453de><b>投掷者</b></color>。<br/><color=#8453de><b>投掷者</b></color>能将食物大老远直接扔给<color=#8453de><b>蚁后</b></color>。<br/><color=#8453de><b>投掷者</b></color>的移动速度为70点。<br/>在扔出50份食物后必须小睡10秒来恢复体力。",
        "icon": "units/bigcrab",
        "nutrients": [],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_HATCH_THROWER",
        "descriptionKey": "UPG_DESCRIPTION_HATCH_THROWER"
      },
      {
        "id": "throwers_ThrowerCapacity",
        "source": "throwers/ThrowerCapacity.tres",
        "title": "强效小睡",
        "description": "将<color=#8453de><b>投掷者</b></color>的恢复时间缩短1秒。",
        "icon": "units/bigcrab_eepy",
        "nutrients": [
          40,
          80,
          300,
          1200,
          5000,
          20000,
          100000,
          1000000,
          10000000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "throwers/SpawnThrower.tres"
        ],
        "titleKey": "UPG_TITLE_ENDURANCE",
        "descriptionKey": "UPG_DESCRIPTION_ENDURANCE"
      },
      {
        "id": "throwers_ThrowerSpeed",
        "source": "throwers/ThrowerSpeed.tres",
        "title": "持久耐力",
        "description": "提升<color=#8453de><b>投掷者</b></color>5点移动速度。",
        "icon": "units/bigcrab",
        "nutrients": [
          200,
          900,
          2100,
          4000,
          7500,
          12000,
          28000,
          55000,
          120000,
          400000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "throwers/SpawnThrower.tres"
        ],
        "titleKey": "UPG_TITLE_THROWER_SPEED",
        "descriptionKey": "UPG_DESCRIPTION_THROWER_SPEED"
      },
      {
        "id": "throwers_CarrierBiggest",
        "source": "throwers/CarrierBiggest.tres",
        "title": "疏通管道",
        "description": "<color=#8453de><b>负责运送食物的劳工</b></color>可能会优先前往食物储量最丰富的食物来源。",
        "icon": "foods/red_apple",
        "nutrients": [
          3000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "queen/BuildingEvolutionChamber.tres"
        ],
        "titleKey": "UPG_TITLE_UNCLOGING",
        "descriptionKey": "UPG_DESCRIPTION_UNCLOGING"
      },
      {
        "id": "throwers_MidasTouch",
        "source": "throwers/MidasTouch.tres",
        "title": "点石成金",
        "description": "投掷<color=#dd1533><b>苹果</b></color>时，<color=#8453de><b>投掷者</b></color>有3%的概率将其变成<color=#edaf3b><b>金色</b></color>的。",
        "icon": "foods/golden_apple",
        "nutrients": [
          0
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [
          "throwers/SpawnThrower.tres"
        ],
        "titleKey": "UPG_TITLE_MIDAS_TOUCH",
        "descriptionKey": "UPG_DESCRIPTION_MIDAS_TOUCH"
      },
      {
        "id": "throwers_Springboard",
        "source": "throwers/Springboard.tres",
        "title": "弹性脑壳",
        "description": "<color=#8453de><b>搬运工</b></color>能把<color=#8453de><b>投掷者</b></color>的脑袋当成跳板，将食物直接抛向目的地，冷却时间10秒。",
        "icon": "units/LeftArm",
        "nutrients": [
          0
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [
          "throwers/SpawnThrower.tres"
        ],
        "titleKey": "UPG_TITLE_SPRINGBOARD",
        "descriptionKey": "UPG_DESCRIPTION_SPRINGBOARD"
      }
    ]
  },
  {
    "title": "陷阱工坊",
    "hint": "猎虫布置陷阱，捕获虫肉后及时搬运，避免腐烂。",
    "items": [
      {
        "id": "hunters_SpawnHunter",
        "source": "hunters/SpawnHunter.tres",
        "title": "孵化陷阱猎手",
        "description": "孵化<color=#8453de><b>陷阱猎手</b></color>。<br/><color=#8453de><b>陷阱猎手</b></color>会从<color=#8453de><b>陷阱工坊</b></color>拿取<color=#5f6162><b>陷阱</b></color>并巧妙布置，每60秒捕获一只<color=#ea85fd><b>野生虫子</b></color>。<br/><color=#ea85fd><b>野生虫子</b></color>会被<color=#5f6162><b>陷阱</b></color>绞碎成<color=#ea85fd><b>肉丸</b></color>，但如果在30秒内没被捡起就会腐烂。",
        "icon": "units/fly",
        "nutrients": [],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_HATCH_TRAPPER",
        "descriptionKey": "UPG_DESCRIPTION_HATCH_TRAPPER"
      },
      {
        "id": "hunters_SpawnBGH",
        "source": "hunters/SpawnBGH.tres",
        "title": "孵化王牌猎人",
        "description": "孵化<color=#8453de><b>王牌猎人</b></color>。<br/><color=#8453de><b>王牌猎人</b></color>利用<color=#5f6162><b>钢铁陷阱</b></color>引诱体型最庞大的<color=#ea85fd><b>野生虫子</b></color>，每只猎物能产出15倍的<color=#ea85fd><b>肉丸</b></color>。",
        "icon": "units/eleph",
        "nutrients": [],
        "larvae": 1,
        "greyMatter": 1,
        "prerequisites": [
          "hunters/SpawnHunter.tres"
        ],
        "titleKey": "UPG_TITLE_HATCH_BGH",
        "descriptionKey": "UPG_DESCRIPTION_HATCH_BGH"
      },
      {
        "id": "hunters_HunterCooldown",
        "source": "hunters/HunterCooldown.tres",
        "title": "空气动力学",
        "description": "提升<color=#8453de><b>陷阱猎手</b></color>的飞行能力，将每次布置<color=#5f6162><b>陷阱</b></color>的间隔时间缩短5秒。",
        "icon": "units/fly2",
        "nutrients": [
          200,
          500,
          1200,
          3000,
          5000,
          8000,
          16000,
          35000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "hunters/SpawnHunter.tres"
        ],
        "titleKey": "UPG_TITLE_AERODYNAMICS",
        "descriptionKey": "UPG_DESCRIPTION_AERODYNAMICS"
      },
      {
        "id": "hunters_Tenderiser",
        "source": "hunters/Tenderiser.tres",
        "title": "嫩肉锤",
        "description": "使<color=#ea85fd><b>肉丸</b></color>的<color=#25bd49><b>食物</b></color>价值提升10点。",
        "icon": "foods/bug_meat",
        "nutrients": [
          500,
          1000,
          3000,
          5000,
          12000,
          25000,
          40000,
          85000,
          150000,
          400000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_TENDERISER",
        "descriptionKey": "UPG_DESCRIPTION_TENDERISER"
      },
      {
        "id": "hunters_SaltedEdge",
        "source": "hunters/SaltedEdge.tres",
        "title": "盐渍刃口",
        "description": "使<color=#ea85fd><b>肉丸</b></color>腐烂前的保质期翻倍。",
        "icon": "trap_closed",
        "nutrients": [
          10000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "hunters/SpawnHunter.tres"
        ],
        "titleKey": "UPG_TITLE_SALTED_EDGE",
        "descriptionKey": "UPG_DESCRIPTION_SALTED_EDGE"
      },
      {
        "id": "hunters_CleanCut",
        "source": "hunters/CleanCut.tres",
        "title": "利落切割",
        "description": "打磨<color=#5f6162><b>陷阱</b></color>边缘，使其更锋利，让<color=#ea85fd><b>肉丸</b></color>产量+1。",
        "icon": "trap_open",
        "nutrients": [
          0
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [
          "hunters/SpawnHunter.tres"
        ],
        "titleKey": "UPG_TITLE_CLEAN_CUT",
        "descriptionKey": "UPG_DESCRIPTION_CLEAN_CUT"
      }
    ]
  },
  {
    "title": "搬运工(东)",
    "hint": "",
    "items": [
      {
        "id": "gemini_SpawnGemini",
        "source": "gemini/SpawnGemini.tres",
        "title": "孵化搬运工",
        "description": "孵化<color=#8453de><b>搬运工</b></color>。<br/><color=#8453de><b>搬运工</b></color>负责将群落产出的食物运送到<color=#8453de><b>蚁后</b></color>。<br/><color=#8453de><b>搬运工</b></color>的基础移动速度为200点。",
        "icon": "units/antidle",
        "nutrients": [],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_HATCH_HAULER",
        "descriptionKey": "UPG_DESCRIPTION_HATCH_HAULER"
      },
      {
        "id": "gemini_GeminiSpeed",
        "source": "gemini/GeminiSpeed.tres",
        "title": "干劲满满",
        "description": "提升<color=#8453de><b>搬运工</b></color>20点移动速度。",
        "icon": "units/antidle",
        "nutrients": [
          10,
          30,
          50,
          120,
          405,
          900,
          2200,
          4000,
          9000,
          12000,
          25000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_HAULER_SPEED",
        "descriptionKey": "UPG_DESCRIPTION_HAULER_SPEED"
      },
      {
        "id": "gemini_GeminiCapacity",
        "source": "gemini/GeminiCapacity.tres",
        "title": "强韧力量",
        "description": "<color=#8453de><b>搬运工</b></color>能额外搬运一份食物。",
        "icon": "units/antidle",
        "nutrients": [
          25,
          50,
          400,
          5000,
          28000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_STRENGTH",
        "descriptionKey": "UPG_DESCRIPTION_STRENGTH"
      },
      {
        "id": "gemini_GeminiCapacityHerculean",
        "source": "gemini/GeminiCapacityHerculean.tres",
        "title": "大力神",
        "description": "<color=#8453de><b>搬运工</b></color>能额外搬运一份食物，但移动速度降低20点。",
        "icon": "units/antidle",
        "nutrients": [
          50000,
          300000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "SPECIALISATION_TITLE_HERCULEAN",
        "descriptionKey": "UPG_DESCRIPTION_STRENGTH_HERCULEAN"
      }
    ]
  },
  {
    "title": "厨房",
    "hint": "",
    "items": [
      {
        "id": "cuisine_RecipePommes",
        "source": "cuisine/RecipePommes.tres",
        "title": "蜜恋糖苹果",
        "description": "在<color=#8453de><b>厨房</b></color>的菜单中加入新食谱：<br/>将1颗<color=#dd1533><b>苹果</b></color>和1颗<color=#e59a34><b>蜜露</b></color>融合成1颗<color=#b46f3c><b>蜜恋糖苹果</b></color>。<br/><br/><color=#edaf3b><b>金苹果</b></color>可融合成<color=#b46f3c><b>鎏金蜜苹果</b></color>。",
        "icon": "foods/candy_apple",
        "nutrients": [
          100000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "NAME_FOOD_POMME_D_AMOUR",
        "descriptionKey": "UPG_DESCRIPTION_POMME_DAMOUR"
      },
      {
        "id": "cuisine_RecipeSkewers",
        "source": "cuisine/RecipeSkewers.tres",
        "title": "炙烤肉串",
        "description": "在<color=#8453de><b>厨房</b></color>的菜单中加入新食谱：将3份<color=#ea85fd><b>肉丸</b></color>融合成1份<color=#b46f3c><b>炙烤肉串</b></color>。",
        "icon": "foods/skewer",
        "nutrients": [
          100000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "NAME_FOOD_BROCHETTE",
        "descriptionKey": "UPG_DESCRIPTION_BROCHETTES"
      },
      {
        "id": "cuisine_RecipeFrostfire",
        "source": "cuisine/RecipeFrostfire.tres",
        "title": "烈焰冰淇淋",
        "description": "在<color=#8453de><b>厨房</b></color>的菜单中加入新食谱：将1份<color=#c12d00><b>辣酱</b></color>和1份<color=#25cee4><b>冰寒莓果</b></color>融合成1份<color=#b46f3c><b>烈焰冰淇淋</b></color>。",
        "icon": "foods/ice_cream",
        "nutrients": [
          300000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "NAME_FOOD_GLACE_FLAMBEE",
        "descriptionKey": "UPG_DESCRIPTION_GLACE_FLAMBEE"
      },
      {
        "id": "cuisine_RecipeScarlet",
        "source": "cuisine/RecipeScarlet.tres",
        "title": "绯红之萃",
        "description": "在<color=#8453de><b>厨房</b></color>的菜单中加入新食谱：将1份<color=#c12d00><b>辣酱</b></color>和1份<color=#e84d00><b>辣椒</b></color>融合成1份<color=#b46f3c><b>绯红之萃</b></color>。<br/><br/><color=#b46f3c><b>绯红之萃</b></color>会施加（8+6x酷热亲和等级）<color=#e84d00><b>酷热</b></color>层数。",
        "icon": "foods/frost",
        "nutrients": [
          300000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "NAME_FOOD_SCARLET",
        "descriptionKey": "UPG_DESCRIPTION_SCARLET"
      },
      {
        "id": "cuisine_SousChef",
        "source": "cuisine/SousChef.tres",
        "title": "孵化副厨",
        "description": "孵化<color=#8453de><b>副厨</b></color>，使烹饪速度翻倍。",
        "icon": "units/chef_idle",
        "nutrients": [
          50000,
          500000
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_HATCH_SOUS_CHEF",
        "descriptionKey": "UPG_DESCRIPTION_HATCH_SOUS_CHEF"
      },
      {
        "id": "cuisine_CordonBleu",
        "source": "cuisine/CordonBleu.tres",
        "title": "蓝带厨艺",
        "description": "可在<color=#8453de><b>厨房</b></color>中同时启用多道食谱。",
        "icon": "units/chef_happy",
        "nutrients": [
          500000
        ],
        "larvae": 0,
        "greyMatter": 1,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_CORDON_BLEU",
        "descriptionKey": "UPG_DESCRIPTION_CORDON_BLEU"
      }
    ]
  },
  {
    "title": "矿场",
    "hint": "",
    "items": [
      {
        "id": "mine_clay",
        "source": "mine/clay.tres",
        "title": "黏土",
        "description": "孵化<color=#8453de><b>矿工</b></color>来采集黏土。<br/>使<color=#8453de><b>厨房</b></color>的烹饪速度翻至3倍。",
        "icon": "buildings/Mine",
        "nutrients": [
          0
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_CLAY",
        "descriptionKey": "UPG_DESCRIPTION_CLAY"
      },
      {
        "id": "mine_amber",
        "source": "mine/amber.tres",
        "title": "琥珀",
        "description": "孵化<color=#8453de><b>矿工</b></color>来寻找琥珀。<br/>使<color=#e59a34><b>黏性蚜虫</b></color>的<color=#e59a34><b>蜜露</b></color>产出量翻倍。",
        "icon": "buildings/Mine",
        "nutrients": [
          0
        ],
        "larvae": 2,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_AMBER",
        "descriptionKey": "UPG_DESCRIPTION_AMBER"
      },
      {
        "id": "mine_coal",
        "source": "mine/coal.tres",
        "title": "煤炭",
        "description": "孵化<color=#8453de><b>矿工</b></color>来开采煤炭。<br/>使<color=#e84d00><b>辛辣食物</b></color>提供的<color=#e84d00><b>酷热</b></color>层数+3。",
        "icon": "buildings/Mine",
        "nutrients": [
          0
        ],
        "larvae": 3,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_COAL",
        "descriptionKey": "UPG_DESCRIPTION_COAL"
      },
      {
        "id": "mine_gold",
        "source": "mine/gold.tres",
        "title": "黄金",
        "description": "孵化<color=#8453de><b>矿工</b></color>来寻找<color=#edaf3b><b>黄金</b></color>。<br/>使出现<color=#edaf3b><b>金苹果</b></color>的所有概率翻倍。",
        "icon": "buildings/Mine",
        "nutrients": [
          0
        ],
        "larvae": 4,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_GOLD",
        "descriptionKey": "UPG_DESCRIPTION_GOLD"
      },
      {
        "id": "mine_icicles",
        "source": "mine/icicles.tres",
        "title": "冰柱",
        "description": "孵化<color=#8453de><b>矿工</b></color>来收集冰柱。<br/>使<color=#25cee4><b>严寒</b></color>的<color=#1c84ff><b>倍率</b></color>提升量翻倍。",
        "icon": "buildings/Mine",
        "nutrients": [
          0
        ],
        "larvae": 2,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_ICICLES",
        "descriptionKey": "UPG_DESCRIPTION_ICICLES"
      },
      {
        "id": "mine_iron",
        "source": "mine/iron.tres",
        "title": "铁矿",
        "description": "孵化<color=#8453de><b>矿工</b></color>来开采铁矿。<br/>使<color=#ea85fd><b>肉丸</b></color>的<color=#5f6162><b>陷阱</b></color>产出量+1。",
        "icon": "buildings/Mine",
        "nutrients": [
          0
        ],
        "larvae": 3,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_IRON",
        "descriptionKey": "UPG_DESCRIPTION_IRON"
      },
      {
        "id": "mine_lead",
        "source": "mine/lead.tres",
        "title": "铅矿",
        "description": "孵化<color=#8453de><b>矿工</b></color>来开采铅矿。<br/>使提供给<color=#8453de><b>渔场</b></color>的鱼饵价值翻倍，让单次捕鱼作业达到最高效率所需的诱饵数量减半。",
        "icon": "buildings/Mine",
        "nutrients": [
          0
        ],
        "larvae": 2,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_LEAD",
        "descriptionKey": "UPG_DESCRIPTION_LEAD"
      },
      {
        "id": "mine_mushrooms",
        "source": "mine/mushrooms.tres",
        "title": "洞窟菇",
        "description": "孵化<color=#8453de><b>矿工</b></color>来采集<color=#6c4838><b>洞窟菇</b></color>。<br/>使<color=#9471bf><b>孢子</b></color>效率提升20%，此效果可让<color=#9471bf><b>孢子</b></color>效率突破100%的上限。",
        "icon": "buildings/Mine",
        "nutrients": [
          0
        ],
        "larvae": 2,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_CAVE_MUSHROOMS",
        "descriptionKey": "UPG_DESCRIPTION_CAVE_MUSHROOMS"
      },
      {
        "id": "mine_nacre",
        "source": "mine/nacre.tres",
        "title": "珍珠母",
        "description": "孵化<color=#8453de><b>矿工</b></color>来探索<color=#8453de><b>矿场</b></color>的地下湖泊并捕捞<color=#398ca4><b>珍珠牡蛎</b></color>。<br/>在<color=#8453de><b>渔场</b></color>中解锁珍珠养殖。<br/>并使<color=#398ca4><b>闪光蚜虫</b></color>的<color=#398ca4><b>珍珠</b></color>产出量翻至3倍。",
        "icon": "buildings/Mine",
        "nutrients": [
          0
        ],
        "larvae": 1,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_NACRE",
        "descriptionKey": "UPG_DESCRIPTION_NACRE"
      },
      {
        "id": "mine_salt",
        "source": "mine/salt.tres",
        "title": "盐矿",
        "description": "孵化<color=#8453de><b>矿工</b></color>来采集盐矿。<br/>使<color=#8453de><b>厨房</b></color>中烹饪出的<color=#25bd49><b>食物</b></color>菜肴基础价值翻至5倍。",
        "icon": "buildings/Mine",
        "nutrients": [
          0
        ],
        "larvae": 2,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_SALT",
        "descriptionKey": "UPG_DESCRIPTION_SALT"
      },
      {
        "id": "mine_uncap",
        "source": "mine/uncap.tres",
        "title": "烈日加冕",
        "description": "孵化<color=#8453de><b>勇敢的冒险家</b></color>，打捞早已被遗忘的<color=#edaf3b><b>太阳石</b></color>。<br/>利用其神秘力量来解除<color=#edaf3b><b>迷醉</b></color>的上限。",
        "icon": "buildings/Mine",
        "nutrients": [
          0
        ],
        "larvae": 1,
        "greyMatter": 1,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_UNCAP",
        "descriptionKey": "UPG_DESCRIPTION_UNCAP"
      }
    ]
  },
  {
    "title": "渔场",
    "hint": "",
    "items": [
      {
        "id": "fishing_firstboat",
        "source": "fishing/firstboat.tres",
        "title": "建造渔船",
        "description": "建造<color=#8453de><b>渔船</b></color>并配备船员。<color=#8453de><b>渔船</b></color>可派往湖面进行捕鱼作业。",
        "icon": "foods/fish",
        "nutrients": [
          1000000
        ],
        "larvae": 2,
        "greyMatter": 0,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_FIRST_BOAT",
        "descriptionKey": "UPG_DESCRIPTION_FIRST_BOAT"
      },
      {
        "id": "fishing_extra_boat",
        "source": "fishing/extra_boat.tres",
        "title": "更多渔船",
        "description": "额外建造一艘<color=#8453de><b>渔船</b></color>前往湖面捕鱼，提升鱼类总产量并加快诱饵消耗。",
        "icon": "foods/fish",
        "nutrients": [
          0
        ],
        "larvae": 2,
        "greyMatter": 1,
        "prerequisites": [
          "fishing/firstboat.tres"
        ],
        "titleKey": "UPG_TITLE_EXTRA_BOAT",
        "descriptionKey": "UPG_DESCRIPTION_EXTRA_BOAT"
      },
      {
        "id": "fishing_ghostship",
        "source": "fishing/ghostship.tres",
        "title": "幽灵船",
        "description": "发现一艘被遗忘的古老船只，虽然看似空无一人，却在神秘力量的驱动下不断捕鱼。",
        "icon": "foods/fish",
        "nutrients": [
          10000000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "fishing/firstboat.tres"
        ],
        "titleKey": "UPG_TITLE_GHOST_SHIP",
        "descriptionKey": "UPG_DESCRIPTION_GHOST_SHIP"
      },
      {
        "id": "fishing_mode_net",
        "source": "fishing/mode_net.tres",
        "title": "渔网",
        "description": "<color=#8453de><b>渔船</b></color>能用渔网捕捞大量<color=#5281eb><b>沙丁鱼</b></color>。<br/>每次作业耗时60秒，产出800条<color=#5281eb><b>沙丁鱼</b></color>。",
        "icon": "foods/fish",
        "nutrients": [
          100000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "fishing/firstboat.tres"
        ],
        "titleKey": "UPG_TITLE_MODE_NETS",
        "descriptionKey": "UPG_DESCRIPTION_MODE_NETS"
      },
      {
        "id": "fishing_mode_divers",
        "source": "fishing/mode_divers.tres",
        "title": "深潜",
        "description": "<color=#8453de><b>渔船</b></color>能派潜水员捕捞少量<color=#e05a3c><b>章鱼</b></color>。<br/>每次作业耗时60秒，产出40只<color=#e05a3c><b>章鱼</b></color>。",
        "icon": "foods/fish",
        "nutrients": [
          100000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "fishing/firstboat.tres"
        ],
        "titleKey": "UPG_TITLE_MODE_DIVING",
        "descriptionKey": "UPG_DESCRIPTION_MODE_DIVING"
      },
      {
        "id": "fishing_mode_pearls",
        "source": "fishing/mode_pearls.tres",
        "title": "珍珠养殖",
        "description": "<color=#8453de><b>渔船</b></color>能养殖湖中牡蛎并收获<color=#398ca4><b>珍珠</b></color>。<br/>每次作业耗时60秒，产出20颗<color=#398ca4><b>珍珠</b></color>。",
        "icon": "foods/fish",
        "nutrients": [
          100000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "fishing/firstboat.tres"
        ],
        "titleKey": "UPG_TITLE_MODE_PEARLS",
        "descriptionKey": "UPG_DESCRIPTION_MODE_PEARLS"
      },
      {
        "id": "fishing_bait_fish",
        "source": "fishing/bait_fish.tres",
        "title": "饥肠辘辘",
        "description": "<color=#ea85fd><b>肉丸</b></color>可用作<color=#5281eb><b>沙丁鱼</b></color>的诱饵。<br/>每提供1份<color=#ea85fd><b>肉丸</b></color>就能将下次作业时间缩短0.4秒，提供100份<color=#ea85fd><b>肉丸</b></color>时达到最短时间20秒。",
        "icon": "foods/fish",
        "nutrients": [
          1000000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "fishing/mode_net.tres"
        ],
        "titleKey": "UPG_TITLE_BAIT_SARDINE",
        "descriptionKey": "UPG_DESCRIPTION_BAIT_SARDINE"
      },
      {
        "id": "fishing_bait_tako",
        "source": "fishing/bait_tako.tres",
        "title": "甜蜜诱惑",
        "description": "<color=#dd1533><b>苹果</b></color>可用作<color=#e05a3c><b>章鱼</b></color>的诱饵。<br/>每消耗1颗<color=#dd1533><b>苹果</b></color>就能将下次作业时间缩短0.2秒，消耗200颗<color=#dd1533><b>苹果</b></color>时达到最短时间20秒。",
        "icon": "foods/fish",
        "nutrients": [
          1000000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "fishing/mode_divers.tres"
        ],
        "titleKey": "UPG_TITLE_BAIT_TAKO",
        "descriptionKey": "UPG_DESCRIPTION_BAIT_TAKO"
      },
      {
        "id": "fishing_bait_pearls",
        "source": "fishing/bait_pearls.tres",
        "title": "珍珠核",
        "description": "<color=#ea85fd><b>肉丸</b></color>可用作珠核来加速形成<color=#398ca4><b>珍珠</b></color>。<br/>每提供1份<color=#ea85fd><b>肉丸</b></color>就能将下次作业时间缩短1秒，提供40份<color=#ea85fd><b>肉丸</b></color>时达到最短时间20秒。",
        "icon": "foods/fish",
        "nutrients": [
          1000000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "fishing/mode_pearls.tres"
        ],
        "titleKey": "UPG_TITLE_BAIT_PEARLS",
        "descriptionKey": "UPG_DESCRIPTION_BAIT_PEARLS"
      },
      {
        "id": "fishing_bait_upgrade_fish",
        "source": "fishing/bait_upgrade_fish.tres",
        "title": "逆流而上",
        "description": "每提供1份<color=#ea85fd><b>肉丸</b></color>作为诱饵，就能额外产出2条<color=#5281eb><b>沙丁鱼</b></color>并直接送给<color=#8453de><b>蚁后</b></color>。",
        "icon": "foods/fish",
        "nutrients": [
          1000000,
          3000000,
          6000000,
          10000000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "fishing/bait_fish.tres"
        ],
        "titleKey": "UPG_TITLE_BAIT_UP_SARDINE",
        "descriptionKey": "UPG_DESCRIPTION_BAIT_UP_SARDINE"
      },
      {
        "id": "fishing_bait_upgrade_tako",
        "source": "fishing/bait_upgrade_tako.tres",
        "title": "羊群效应",
        "description": "每提供20颗<color=#dd1533><b>苹果</b></color>作为诱饵，就能额外产出1只<color=#e05a3c><b>章鱼</b></color>。",
        "icon": "foods/fish",
        "nutrients": [
          1000000,
          3000000,
          6000000,
          10000000
        ],
        "larvae": 0,
        "greyMatter": 0,
        "prerequisites": [
          "fishing/bait_tako.tres"
        ],
        "titleKey": "UPG_TITLE_BAIT_UP_TAKO",
        "descriptionKey": "UPG_DESCRIPTION_BAIT_UP_TAKO"
      }
    ]
  },
  {
    "title": "地道巢穴",
    "hint": "孵化地道虫并调整地道运输策略。",
    "items": [
      {
        "id": "tunnellers_tunneller",
        "source": "tunnellers/tunneller.tres",
        "title": "孵化掘地工",
        "description": "孵化<color=#8453de><b>掘地工</b></color>。<br/><color=#8453de><b>掘地工</b></color>生性害羞，不喜欢在地面抛头露面，宁可整天待在地下挖土。<br/><color=#8453de><b>掘地工</b></color>每30秒会挖出一条地道，将特定食物来源直接连接到目的地。地道可持续运输食物30秒，或直到运满2500个单位的食物为止。",
        "icon": "units/antidle",
        "nutrients": [],
        "larvae": 1,
        "greyMatter": 1,
        "prerequisites": [],
        "titleKey": "UPG_TITLE_TUNNELLER",
        "descriptionKey": "UPG_DESCRIPTION_TUNNELLER"
      }
    ]
  },
  {
    "title": "基因",
    "hint": "",
    "items": []
  }
];
export const GENE_TAB_INDEX = UPGRADE_GROUPS.length - 1;
export const TUNNELLER_TAB_INDEX = GENE_TAB_INDEX - 1;
