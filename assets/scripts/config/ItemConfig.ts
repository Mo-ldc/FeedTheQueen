// Original food_data.gd IDs and feed_manager.gd initial base values.
// Base catalog values only; live taste and upgrade formulas are owned by FeedingModel.
export const FOOD_ITEMS = [
  {
    "id": 1,
    "nameKey": "NAME_FOOD_APPLE_RED",
    "icon": "textures/art/foods/red_apple.png",
    "color": "dd1533",
    "baseNutrition": 20,
    "implemented": true
  },
  {
    "id": 2,
    "nameKey": "NAME_FOOD_APPLE_GOLD",
    "icon": "textures/art/foods/golden_apple.png",
    "color": "edaf3b",
    "baseNutrition": 200,
    "implemented": true
  },
  {
    "id": 3,
    "nameKey": "NAME_FOOD_BLUEBERRY",
    "icon": "textures/art/foods/blueberry.png",
    "color": "2b66c5",
    "baseNutrition": 1,
    "implemented": true
  },
  {
    "id": 4,
    "nameKey": "NAME_FOOD_ICEBERRY",
    "icon": "textures/art/foods/iceberry.png",
    "color": "25cee4",
    "baseNutrition": 5,
    "implemented": true
  },
  {
    "id": 5,
    "nameKey": "NAME_FOOD_SPICY",
    "icon": "textures/art/foods/pepper.png",
    "color": "e84d00",
    "baseNutrition": 10,
    "implemented": true
  },
  {
    "id": 6,
    "nameKey": "NAME_FOOD_SOUR",
    "icon": "textures/art/foods/citrony.png",
    "color": "5f7f1e",
    "baseNutrition": 3,
    "implemented": true
  },
  {
    "id": 7,
    "nameKey": "NAME_FOOD_WIRLY",
    "icon": "textures/art/foods/star.png",
    "color": "9757af",
    "baseNutrition": 1,
    "implemented": true
  },
  {
    "id": 8,
    "nameKey": "NAME_FOOD_HONEYDEW",
    "icon": "textures/art/foods/honeydew.png",
    "color": "e59a34",
    "baseNutrition": 5,
    "implemented": true
  },
  {
    "id": 9,
    "nameKey": "NAME_FOOD_HOTSAUCE",
    "icon": "textures/art/foods/spicy_sauce.png",
    "color": "c12d00",
    "baseNutrition": 1,
    "implemented": true
  },
  {
    "id": 10,
    "nameKey": "NAME_FOOD_BUGMEAT",
    "icon": "textures/art/foods/bug_meat.png",
    "color": "ea85fd",
    "baseNutrition": 50,
    "implemented": true
  },
  {
    "id": 11,
    "nameKey": "NAME_FOOD_SARDINE",
    "icon": "textures/art/foods/fish.png",
    "color": "5281eb",
    "baseNutrition": 125,
    "implemented": true
  },
  {
    "id": 12,
    "nameKey": "NAME_FOOD_TAKO",
    "icon": "textures/art/foods/tako.png",
    "color": "e05a3c",
    "baseNutrition": 1000,
    "implemented": true
  },
  {
    "id": 13,
    "nameKey": "NAME_FOOD_PEARL",
    "icon": "textures/art/foods/pearl.png",
    "color": "f0c4dd",
    "baseNutrition": 0,
    "implemented": true
  },
  {
    "id": 14,
    "nameKey": "NAME_FOOD_CHANTERELLE",
    "icon": "textures/art/foods/chanterelle.png",
    "color": "b56e00",
    "baseNutrition": 0,
    "implemented": true
  },
  {
    "id": 15,
    "nameKey": "NAME_FOOD_POMME_D_AMOUR",
    "icon": "textures/art/foods/candy_apple.png",
    "color": "bd322e",
    "baseNutrition": 60,
    "implemented": true
  },
  {
    "id": 16,
    "nameKey": "NAME_FOOD_POMME_D_AMOUR_GOLD",
    "icon": "textures/art/foods/golden_candy_apple.png",
    "color": "edaf3b",
    "baseNutrition": 600,
    "implemented": true
  },
  {
    "id": 17,
    "nameKey": "NAME_FOOD_BROCHETTE",
    "icon": "textures/art/foods/skewer.png",
    "color": "ea85fd",
    "baseNutrition": 500,
    "implemented": true
  },
  {
    "id": 18,
    "nameKey": "NAME_FOOD_GLACE_FLAMBEE",
    "icon": "textures/art/foods/ice_cream.png",
    "color": "45d7dc",
    "baseNutrition": 50,
    "implemented": true
  },
  {
    "id": 19,
    "nameKey": "NAME_FOOD_SCARLET",
    "icon": "textures/art/foods/frost.png",
    "color": "ab1818",
    "baseNutrition": 20,
    "implemented": true
  }
];
export const BLUEBERRY = FOOD_ITEMS[2];
export const CURRENCIES = [
  {
    "id": "nutrients",
    "name": "食物",
    "icon": "textures/art/foods/green_apple.png",
    "visibility": "always"
  },
  {
    "id": "larvae",
    "name": "幼虫",
    "icon": "textures/art/icons/larva.png",
    "visibility": "always"
  },
  {
    "id": "greyMatter",
    "name": "脑灰质",
    "icon": "textures/art/icons/brain.png",
    "visibility": "ever-owned"
  },
  {
    "id": "dna",
    "name": "基因点数",
    "icon": "textures/art/icons/dna.png",
    "visibility": "positive"
  }
];
