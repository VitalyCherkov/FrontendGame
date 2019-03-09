import * as React from 'libs/Cheburact';
import * as CheburactDOM from 'libs/CheburactDOM';

class Lol extends React.Component {
  headerRef: null | HTMLElement = null;
  state = {
    text: 0,
  };

  handleSetHeaderRef = (ref: HTMLElement) =>
      this.headerRef = ref;

  handleClick = () => {
    console.log('click');
    this.setState({ text: this.state.text + 1 });
    this.props.onClick(this.state.text + 6);
  };

  render() {
    console.log('RENDER', this.state, this.props);
    return (
        <div className={'root'} hidden={false} key='array-container'>
          <h2
              className={'header'}
              ref={this.handleSetHeaderRef}
          >{ `${this.state.text}` }</h2>
          { Array
              .from(Array(this.state.text).keys())
              .map((i) => (
                <p className={'list-item'} key={i}>{`${i}`}</p>
              ))
          }
          <button
            onClick={ this.handleClick }
          >{ this.props.title }</button>
          { this.state.text % 2 === 0 && 'Четное' }
        </div>
    );
  }
}

class Kek extends React.Component {
  state = {
    outerText: 0,
    title: 'Hello world',
    inputVal: '',
    focus: false,
  };

  handleOuterClick = () => {
    this.setState({title: this.state.title === 'Hello world' ? '---' : 'Hello world' });
  };

  handleChangeValue = (e) => {
    this.setState({ inputVal: e.target.value });
    console.log(e);
  };

  setFocus = () => this.setState({ focus: true });
  setBlur = () => this.setState({ focus: false });

  render() {
    console.log('render lol', this.state);

    return (
        <div>
          <Lol aaa='bbb' onClick={(text) => this.setState({ outerText: text })} title={this.state.title} />
          <button onClick={this.handleOuterClick}>{`outer ${this.state.outerText}`}</button>
          <input
              value={this.state.inputVal}
              onChange={this.handleChangeValue}
              onFocus={this.setFocus}
              onBlur={this.setBlur}
          />
          { this.state.focus ? 'FOCUS' : 'BLUR' }
        </div>
    );
  }
}

CheburactDOM.render(
    <div kek={'lol'} key='root'>
      <Kek />
      <p>Hello world</p>
    </div>,
    document.getElementById('root'),
);
