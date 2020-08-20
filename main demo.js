import { createElement, Component, render } from "./toy-react.js";

class MyComponent extends Component {

  render() {
    return (
      <div>
        <h1>MyComponent</h1>
        {this.children}
      </div>
    );
  }
}

window.onload = function () {
  render(
    <MyComponent id="a" class="b">
      <div>abc</div>
      <div>xyz</div>
      <div>123</div>
    </MyComponent>,
    document.body
  );
};
