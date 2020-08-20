const RENDER_TO_DOM = Symbol("render to dom");

export class Component {
  constructor() {
    this.props = Object.create(null);
    this.children = [];
    this._root = null;
    this._range = null;
  }
  setAttribute(key, value) {
    this.props[key] = value;
  }
  appendChild(component) {
    this.children.push(component);
  }
  get vdom (){
    return this.render().vdom;
  }
  [RENDER_TO_DOM](range) {
    this._range = range;
    this._vdom = this.vdom;
    this._vdom[RENDER_TO_DOM](range);
  }
  update() {
    let isSameNode = (oldNode, newNode) => {
      // type，props 比较 不一致就直接去更新，不再比较子节点
      if(oldNode.type !== newNode.type ){
        return false;
      }
      for (let key in newNode.props) {
        if (newNode.props[key] !== oldNode.props[key]) {
          return false;
        }
      }
      if(Object.keys(oldNode.props).length > Object.keys(newNode.props).length){
        return false;
      }
      if(newNode.type === '#text'){
        if(newNode.content !== oldNode.content){
          return false;
        }
      }
      return true;
    }

    let update = (oldNode, newNode) => {
      if(!isSameNode(oldNode, newNode)){
        // 不同节点，进行更新
        newNode[RENDER_TO_DOM](oldNode._range);
        return;
      }
      //  相同节点，对新节点缓存
      newNode._range = oldNode._range;

      let newChildren = newNode.vchildren;
      let oldChildren = oldNode.vchildren;
      // 没有新子节点 直接退出
      if(!newChildren || !newChildren.length ){
        return;
      }
      // 缓存旧节点结尾的位置
      let tailRange = oldChildren[oldChildren.length -1]._range;

      for (let i=0; i< newChildren.length; i++) {
        let newChild = newChildren[i];
        let oldChild = oldChildren[i];
        if(i < oldChildren.length){
          update(oldChild, newChild);
        }else{
          // 新增的新节点，直接渲染
          let range = document.createRange();
          range.setStart(tailRange.endContainer, tailRange.endOffset);
          range.setEnd(tailRange.endContainer, tailRange.endOffset);
          newChild[RENDER_TO_DOM](range);
          tailRange = range;
        }
      }
    }
    let vdom = this.vdom;
    update(this._vdom, vdom);
    this._vdom = vdom;
  }
  /*rerender() {
    let oldRange = this._range;
    // 在之前范围起始位置更新
    let range = document.createRange();
    range.setStart(oldRange.startContainer, oldRange.startOffset);
    range.setEnd(oldRange.startContainer, oldRange.startOffset);
    this[RENDER_TO_DOM](range);
    // 将之前的范围设置在插入后的位置，在删除之前旧内容
    oldRange.setStart(range.endContainer, range.endOffset)
    oldRange.deleteContents();
  }*/
  setState(newState) {
    if (this.state === null || typeof this.state !== "object") {
      this.state = newState;
      this.rerender();
      return;
    }
    // 深拷贝去对比2个state对象 进行合并
    let merge = (oldState, newState) => {
      for (const p in newState) {
        if (oldState[p] === null || typeof oldState[p] !== "object") {
          oldState[p] = newState[p];
        }else{
          merge(oldState[p], newState[p]);
        }
      }
    }
    merge(this.state, newState);
    this.update();
  }
}

class ElementWrapper extends Component{
  constructor(type) {
    super(type);
    this.type = type;
  }
  /*setAttribute(key, value) {
    // 针对事件绑定处理
    // [\s\S] 获取on后面的事件名称
    if( key.match(/^on([\s\S]+)$/) ){
      // 事件名称首字母小写
      this.root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
    } else{
      // 普通属性设置
      if(key === 'className'){
        key = 'class';
      }
      this.root.setAttribute(key, value);
    }
  }
  appendChild(component) {
    let range = document.createRange();
    range.setStart(this.root, this.root.childNodes.length);
    range.setEnd(this.root, this.root.childNodes.length);
    component[RENDER_TO_DOM](range);
  }*/
  get vdom () {
    this.vchildren = this.children.map(child => child.vdom);
    return this;
    /*{
      type: this.type,
      props: this.props,
      children: this.children.map(child => child.vdom)
    }*/
  }
  [RENDER_TO_DOM](range) {
    this._range = range;
    // 延迟根节点创建位置
    let root = document.createElement(this.type);
    for (let key in this.props) {
      let value = this.props[key];
      if( key.match(/^on([\s\S]+)$/) ){
        // 事件名称首字母小写
        root.addEventListener(RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()), value);
      } else{
        // 特殊处理类名属性
        key === 'className' && (key = 'class');
        // 普通属性设置
        root.setAttribute(key, value);
      }
    }
    // 再次确认变量 vchildren
    if(!this.vchildren){
      this.vchildren = this.children.map(child => child.vdom);
    }
    for (const child of this.vchildren) {
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_TO_DOM](childRange);
    }
    replaceContent(range, root);

  }
}

class TextWrapper extends Component{
  constructor(content) {
    super(content);
    this.type = '#text';
    this.content = content;
  }
  get vdom () {
    return this;
    /*{
      type: '#text',
      content: this.content
    }*/
  }
  [RENDER_TO_DOM](range) {
    this._range = range;
    let root = document.createTextNode(this.content);
    replaceContent(range, root);
  }
}

function replaceContent(range, node){
  range.insertNode(node);
  range.setStartAfter(node);
  range.deleteContents();

  range.setStartBefore(node);
  range.setEndAfter(node);

}

// createElement 对应 React.createElement
export function createElement(type, attributes, ...children) {
  let e;
  if (typeof type === "string") {
    // 原生标签
    e = new ElementWrapper(type);
  } else {
    // 自定义组件类
    e = new type();
  }
  for (let prop in attributes) {
    e.setAttribute(prop, attributes[prop]);
  }
  let insertChildren = (children) => {
    for (let child of children) {
      if (typeof child === "string") {
        child = new TextWrapper(child);
      }
      if(child === null){
        continue;
      }
      if (Object.prototype.toString.call(child) === "[object Array]") {
        // 子节点数组 就递归调用处理
        insertChildren(child);
      } else {
        e.appendChild(child);
      }
    }
  };
  insertChildren(children);

  return e;
}

export function render(component, parentElement) {
  let range = document.createRange();
  range.setStart(parentElement, 0);
  range.setEnd(parentElement, parentElement.childNodes.length);
  range.deleteContents();
  component[RENDER_TO_DOM](range);
}
