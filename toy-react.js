class ElementWrapper {
    constructor(type){
        this.root = document.createElement(type);
    }
    setAttribute(key,value){
        this.root.setAttribute(key, value);
    }
    appendChild(component){
        this.root.appendChild(component.root);
    }
}

class TextWrapper {
    constructor(content){
        this.root = document.createTextNode(content);
    }
}

export class Component {
    constructor(){
        this.props = Object.create(null);
        this.children = [];
        this._root = null;
    }
    setAttribute(key,value){
        this.props[key] = value;
    }
    appendChild(component){
        this.children.push(component);
    }
    get root(){
        if(!this._root){
             this._root = this.render().root;
        }
        return this._root;
    }
}
// createElement 对应 React.createElement
export function createElement(type, attributes, ...children){
    let e;
    if(typeof type === 'string'){
        // 原生标签
        e = new ElementWrapper(type);
    }else {
        // 自定义组件类
        e = new type();
    }
    for (let prop in attributes) {
        e.setAttribute(prop, attributes[prop])
    }
    let insertChildren = (children) => {
        for (let child of children) {
            if (typeof child === 'string') {
                child = new TextWrapper(child)
            }
            if(Object.prototype.toString.call(child) === "[object Array]"){
                // 子节点数组 就递归调用处理
                insertChildren(child);
            }else{
                e.appendChild(child);
            }
            
        }
    }
    insertChildren(children);

    return e;
}

export function render(component, parentElement) {
    parentElement.appendChild(component.root);
}