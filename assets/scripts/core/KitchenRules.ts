export const RECIPES=[{id:'RecipePommes',food:15,inputs:[[1,1],[8,1]]},{id:'RecipeSkewers',food:17,inputs:[[10,3]]},{id:'RecipeFrostfire',food:18,inputs:[[9,1],[4,1]]},{id:'RecipeScarlet',food:19,inputs:[[9,1],[5,1]]}];
/** Atomically consumes ingredients. Golden apples take precedence over normal apples. */
export function cookRecipe(index:number,stock:Record<number,number>):number {
    const recipe=RECIPES[index];if(!recipe)return 0;
    const golden=index===0&&(stock[2]||0)>0;
    const inputs=golden?[[2,1],[8,1]]:recipe.inputs;
    if(inputs.some(([food,amount])=>(stock[food]||0)<amount))return 0;
    for(const [food,amount]of inputs)stock[food]-=amount;
    return golden?16:recipe.food;
}
