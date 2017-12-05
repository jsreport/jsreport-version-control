import React, { Component } from 'react'
import Studio from 'jsreport-studio'
import ChangesTable from './ChangesTable.js'

export default class LocalChangesEditor extends Component {
  constructor (props) {
    super(props)
    this.state = {message: ''}
  }

  async componentDidMount () {
    try {
      const res = await Studio.api.get(`/api/source-control/diff`)
      this.setState({ diff: res })
    } catch (e) {
      alert(e)
    }
  }

  async commit () {
    try {
      await Studio.api.post(`/api/source-control/commit`, {
        data: {
          message: this.state.message
        }
      })
    } catch (e) {
      alert(e)
    }
  }

  render () {
    return (
      <div className='block custom-editor'>
        <div>
          <h1><i className='fa fa-history' /> uncommited changes</h1>
          <div className='form-group'>
            <label>Message</label>
            <input type='text' value={this.state.message} onChange={(event) => this.setState({message: event.target.value})} />
          </div>
          <div>
            <button className='button confirmation' onClick={() => this.commit()}>Commit</button>
          </div>
          <div className='block-item' style={{marginTop: '2rem'}}>
            {this.state.diff ? <ChangesTable changes={this.state.diff} /> : ''}
          </div>
        </div>
      </div>
    )
  }
}
