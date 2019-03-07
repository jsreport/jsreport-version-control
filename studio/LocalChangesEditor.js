import React, { Component } from 'react'
import Studio from 'jsreport-studio'
import ChangesTable from './ChangesTable.js'
import style from './VersionControl.scss'

export default class LocalChangesEditor extends Component {
  constructor (props) {
    super(props)
    this.state = { message: '' }
  }

  onTabActive () {
    this.load()
  }

  async load () {
    if (this.fetchRequested) {
      return
    }

    this.fetchRequested = true

    try {
      const res = await Studio.api.get(`/api/version-control/local-changes`)
      this.setState({ diff: res })
    } catch (e) {
      alert(e)
    } finally {
      this.fetchRequested = false
    }
  }

  async commit () {
    if (!this.state.message) {
      return this.setState({ error: 'Commit message must be filled' })
    }

    try {
      await Studio.api.post(`/api/version-control/commit`, {
        data: {
          message: this.state.message
        }
      })
      this.setState({ message: '', error: null })
      await this.load()
    } catch (e) {
      alert(e)
    }
  }

  async revert () {
    try {
      if (confirm('This will delete all your uncommited files and revert changes. Are you sure?')) {
        await Studio.api.post(`/api/version-control/revert`)

        return Studio.reset().catch((e) => console.error(e))
      }
    } catch (e) {
      alert(e)
    }
  }

  history () {
    Studio.openTab({ key: 'versionControlHistory', editorComponentKey: 'versionControlHistory', title: 'Commits history' })
  }

  render () {
    return (
      <div className='block custom-editor'>
        <h1>
          <i className='fa fa-history' /> uncommited changes
          <button className='button confirmation' onClick={() => this.history()}>Commits history</button>
        </h1>
        <div className='form-group'>
          The version control is currently in beta.
        </div>
        <div className='form-group'>
          <label>Message</label>
          <input type='text' value={this.state.message} onChange={(event) => this.setState({ message: event.target.value, error: null })} />
          <span style={{ color: 'red', display: this.state.error ? 'block' : 'none' }}>{this.state.error}</span>
        </div>
        <div>
          <button className='button confirmation' onClick={() => this.commit()}>Commit</button>
          <button className='button danger' onClick={() => this.revert()}>Revert</button>
        </div>
        <div className={style.listContainer + ' block-item'}>
          {this.state.diff ? <ChangesTable changes={this.state.diff} /> : ''}
        </div>
      </div>
    )
  }
}
