import { builtinResMgr, Color, Node, Sprite, SpriteFrame, Texture2D } from 'cc';

/** Sprite vertex alpha follows UIOpacity; Graphics fill vertices do not. */
export function addBlackFadeSprite(node: Node): void {
    const frame = new SpriteFrame();
    frame.texture = builtinResMgr.get<Texture2D>('white-texture');
    frame.packable = false;
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.spriteFrame = frame;
    sprite.color = Color.BLACK;
    node.once(Node.EventType.NODE_DESTROYED, () => frame.destroy());
}
