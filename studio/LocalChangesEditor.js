import React, { Component } from 'react'
import Studio from 'jsreport-studio'
import ChangesTable from './ChangesTable.js'

export default class LocalChangesEditor extends Component {
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
      await Studio.api.post(`/api/source-control/checkout`, {
        data: {
          _id: id
        }
      })
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
      <div>
        <h2>
          {commit.message}
          <button className='button danger' onClick={() => this.checkout(commit._id)}>Checkout</button>
        </h2>

      </div>
    </div>)
  }

  render () {
    return (
      <div className='block custom-editor'>
        <div>
          <h1><i className='fa fa-history' /> Commits history</h1>
          <div className='block-item'>
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
          <div className='block-item' style={{marginTop: '2rem'}}>
            {this.state.commit ? this.renderCommit(this.state.commit) : 'Select commit....'}
            {this.state.diff ? <ChangesTable changes={this.state.diff} /> : ''}
          </div>
        </div>
      </div>
    )
  }
}
