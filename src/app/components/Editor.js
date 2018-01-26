import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'stent/lib/react';
import ReactMde, { ReactMdeCommands } from 'react-mde';
import Search from './Search';

const ENTER = 13;
const ESCAPE = 27;
const N = 78;
const F = 70;

class Editor extends React.Component {
  constructor(props) {
    super(props);

    this._onChange = this._onChange.bind(this);
    this._save = this._save.bind(this);
    this._exit = this._exit.bind(this);
    this._onEditorAreaKeyDown = this._onEditorAreaKeyDown.bind(this);
    this.state = { text: '' };
  }
  get editorArea() {
    if (!this._editorArea) {
      this._editorArea = document.querySelector('#editorArea');
    }
    return this._editorArea;
  }
  componentDidMount() {
    setTimeout(() => {
      this.editorArea && this.editorArea.focus();
      this._setShortcuts();
    }, 100);
  }
  componentWillUnmount() {
    this._unsetShortcuts();
  }
  _save() {
    this.props.save(this.state.text);
  }
  _exit() {
    this.props.exit();
  }
  _onChange(text) {
    this.setState({ text });
  }
  _onEditorAreaKeyDown(event) {
    if (event.keyCode === ENTER && event.ctrlKey) {
      this._save();
    } else if (event.keyCode === ESCAPE) {
      this._exit();
    } else if (event.ctrlKey && event.keyCode === N) {
      this.props.newNote();
    } else if (event.ctrlKey && event.keyCode === F) {
      this.props.search();
    }
  }
  _setShortcuts() {
    this._editorArea && this._editorArea.addEventListener('keydown', this._onEditorAreaKeyDown);
  }
  _unsetShortcuts() {
    this._editorArea && this._editorArea.removeEventListener('keydown', this._onEditorAreaKeyDown);
  }
  render() {
    return (
      <div className='editor'>
        <ReactMde
          textAreaProps={{ id: 'editorArea' }}
          visibility={{
            toolbar: false,
            preview: false,
            previewHelp: false,
            textarea: true
          }}
          value={ this.state.text }
          onChange={ this._onChange }
          commands={ ReactMdeCommands.getDefaultCommands() }
        />
        <nav>
          <div>
            <a className='button close' onClick={ this._exit }><i className='fa fa-close'></i></a>
          </div>
          <div>
            <a className='button save' onClick={ this._save }><i className='fa fa-check'></i></a>
          </div>
        </nav>
      </div>
    );
  }
}

Editor.propTypes = {
  exit: PropTypes.func,
  save: PropTypes.func,
  search: PropTypes.func,
  newNote: PropTypes.func
};

const WiredEditor = connect(Editor)
  .with('Sidebar', 'Notes')
  .map((sidebar, notes) => ({
    exit: () => sidebar.close(),
    save: ({ text }) => {
      notes.createNote(text);
      sidebar.close();
    },
    newNote: () => sidebar.open(<WiredEditor />),
    search: () => sidebar.open(<Search />)
  }));

export default WiredEditor;