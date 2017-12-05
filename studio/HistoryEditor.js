import React, { Component } from 'react'
import Studio from 'jsreport-studio'
import ChangesTable from './ChangesTable.js'
import style from './VersionControl.scss'

export default class HistoryEditor extends Component {
  constructor () {
    super()
    this.state = { history: [] }
  }

  async componentDidMount () {
    try {
      const res = await Studio.api.get(`/api/source-control/history`)
      this.setState({ history: res })
    } catch (e) {
      alert(e)
    }
  }

  async checkout (id) {
    try {
      const localChanges = await Studio.api.get(`/api/source-control/local-changes`)
      if (localChanges.length > 0) {
        return this.setState({error: 'You have uncommited changes. You need to commit or revert them before checkout.'})
      }
      if (confirm('This will change the state of all entities to the state stored with selected commit. Are you sure?')) {
        await Studio.api.post(`/api/source-control/checkout`, {
          data: {
            _id: id
          }
        })
      }
    } catch (e) {
      alert(e)
    }
  }

  async selectCommit (c) {
    this.setState({ commit: c })

    try {
      const res = await Studio.api.get(`/api/source-control/diff/${c._id}`)
      this.setState({ diff: res })
    } catch (e) {
      alert(e)
    }
  }

  renderCommit (commit) {
    return (<div>
      <h2>
        {commit.message}
      </h2>
      <div>
        <small>{commit.date.toLocaleString()}</small>
        <button className='button danger' onClick={() => this.checkout(commit._id)}>Checkout</button>
        <span style={{color: 'red', marginTop: '0.5rem', display: this.state.error ? 'block' : 'none'}}>{this.state.error}</span>
      </div>
    </div>)
  }

  render () {
    return (
      <div className='block custom-editor'>
        <h1><i className='fa fa-history' /> Commits history</h1>
        <div className={style.listContainer + ' block-item'}>
          <table className='table'>
            <thead>
              <tr>
                <th>date</th>
                <th>message</th>
              </tr>
            </thead>
            <tbody>{this.state.history.map((h) => <tr key={h._id} onClick={() => this.selectCommit(h)}>
              <td>{h.date.toLocaleString()}</td>
              <td>{h.message}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div style={{marginTop: '1rem', marginBottom: '1rem'}}>
          {this.state.commit ? this.renderCommit(this.state.commit) : 'Select a commit....'}
        </div>
        <div className={style.listContainer + ' block-item'}>
          {this.state.diff ? <ChangesTable changes={this.state.diff} /> : ''}
        </div>
      </div>
    )
  }
}
