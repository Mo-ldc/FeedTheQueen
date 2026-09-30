import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

/** Editable layout settings owned by RateStatusPanel.prefab. */
@ccclass('RateStatusLayout')
export class RateStatusLayout extends Component {
    @property({ displayName: '自动排列食物和面板', tooltip: '关闭后保留预制体内节点的位置与尺寸，仅更新数据和显隐。' })
    autoLayout = true;
    @property({ displayName: '面板顶部位置' }) panelTop = 45;
    @property({ displayName: '距屏幕左侧' }) leftMargin = 10;
    @property({ displayName: '最小缩放' }) minScale = .9;
    @property({ displayName: '最大缩放' }) maxScale = 1.05;
    @property({ displayName: '适配参考宽度' }) referenceWidth = 470;
    @property({ displayName: '食物行间距' }) rowHeight = 39;
    @property({ displayName: '标题区域高度' }) headingHeight = 68;
    @property({ displayName: '加成区域高度' }) bonusHeight = 36;
    @property({ displayName: '效果图标区域高度' }) buffsHeight = 43;
    @property({ displayName: '底部留白' }) bottomPadding = 16;
    @property({ displayName: '面板最小高度' }) minHeight = 120;
    @property({ displayName: '两块面板间距' }) progressGap = 10;
}
