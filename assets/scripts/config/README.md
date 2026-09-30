# 游戏配置入口

游戏参数统一放在 assets/scripts/config；行为组件、节点和存档状态不要放在这里。

| 文件 | 修改内容 |
| --- | --- |
| ItemConfig.ts | 4 种货币的名称/图标/显示规则，19 种原版食物 ID、图标、颜色、初始基础营养；implemented 标明是否已接入。当前实际食用逻辑只实现蓝莓。其他食物的状态效果和升级修正尚未实现。 |
| UpgradeConfig.ts | 当前 3 个分类、13 项升级：标题、说明、营养费用数组、幼虫/灰质费用、前置条件。 |
| EconomyConfig.ts | 初始余额、一次产卵数量、幼虫费用公式、大数截断阶梯、升级效果增量。 |
| WorldConfig.ts | 果丛数量/刷新、飞行尺寸与弧高、淡出时长、60 秒统计窗口、幼虫移动/动画/出生范围、觅食者速度/发现间隔/动画、渲染层、地图缩放、建筑解锁镜头/弹性展开/音量。 |
| MapConfig.ts | 原版首局 21 个果丛点、随机刷新多边形、果实摆放位置、觅食者地洞位置与探索区域。坐标已转换成 Cocos 的 Y 向上。 |
| UIConfig.ts | 长按和拖动阈值、点击防抖、面板动画、状态阈值、数字缩写规则、蚁后/DNA 里程碑数组。 |
| DebugConfig.ts | 调试资源按钮的开关和单次赠送数量；enabled 默认关闭。 |

例：修改 EconomyConfig 的 larvaProduction.amount 调整每次产卵数量；修改 WorldConfig 的 larva.speed 调整幼虫移动速度；blueberry.fadeSeconds 控制果丛淡出；flight.size 控制飞行蓝莓大小。

范围：已实现系统的运行参数以及当前 UI 使用的道具目录集中于此。未接入的原版科技、AI、转生等规则待实现时继续补充，不能把未实现目录条目当作已可用玩法。道具 baseNutrition 是原版初始基础值，不是含状态加成的最终营养公式。

单位：世界尺寸为 Cocos 设计坐标，动画/移动计时为秒；UI_RULES.longPressMs/purchaseDebounceMs 为毫秒。地图拖动误触容差使用输入屏幕坐标。

Game.scene 中原有初始余额、缩放默认值的序列化副本已经清理，避免覆盖配置。运行中实时余额/等级属于状态，不写回配置。改配置后重新预览；既有实例并非全部支持热修改。

静态 UI 布局、精灵帧引用和点击框形状保留在场景/预制体中。幼虫、果丛用预制体管理外观，行为脚本只读取配置。道具说明为原始文本，改效果时也应同步修改 UpgradeConfig 对应描述。

## 生成工具

node tools/prepare-upgrade-ui.cjs 默认只读取 UpgradeConfig，生成搭建输入，不覆盖你手动调整的价格。

只有明确执行 node tools/prepare-upgrade-ui.cjs --import-original 才会从原 Godot 资源重新导入并覆盖 UpgradeConfig。不要在改完策划数值后随意使用此参数。

## 验证

node tools/test-upgrade-state.cjs
node tools/test-blueberry.cjs

前者还验证修改配置后，新生产数量与价格公式确实生效，不是复制一份无人读取的数据。

