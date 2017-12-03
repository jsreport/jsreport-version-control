import Studio from 'jsreport-studio'
import React from 'react'

class CommitModal extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      message: ''
    }
  }

  async commit () {
    console.log('posting', this.state.message)
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
      <div>
        <p>
        Commit your changes.... see the list....
        </p>
        <label>Message</label>
        <input type='text' value={this.state.message} onChange={(event) => this.setState({message: event.target.value})} />
        <button onClick={() => this.commit()}>Commit</button>
      </div>
    )
  }
}

class HistoryModal extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      history: []
    }
  }

  async componentDidMount () {
    try {
      const res = await Studio.api.get(`/api/source-control/history`)
      this.setState({ history: res })
    } catch (e) {
      alert(e)
    }
  }

  async checkout (sha) {
    try {
      await Studio.api.post(`/api/source-control/checkout`, {
        data: {
          sha: sha
        }
      })
    } catch (e) {
      alert(e)
    }
  }

  async selectCommit (c) {
    this.setState({ commit: c })

    try {
      const res = await Studio.api.get(`/api/source-control/diff/${c.sha}`)
      this.setState({ diff: res })
    } catch (e) {
      alert(e)
    }
  }

  renderCommit (commit) {
    return (<div>
      <div>
        <span>{commit.message}</span>
      </div>
      <div>
        <button onClick={() => this.checkout(commit.sha)}>Checkout</button>
      </div>
    </div>)
  }

  render () {
    return (
      <div>
        <p>
        Commits history
        </p>
        <div style={{float: 'left'}}>
          <table className='table'>
            <tbody>{this.state.history.map((h) => <tr onClick={() => this.selectCommit(h)}>
              <td>{h.date.toLocaleString()}</td>
              <td>{h.message}</td>
              <td>{h.sha}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <div>
          {this.state.commit ? this.renderCommit(this.state.commit) : 'Select commit....'}
          {this.state.diff ? this.state.diff.map((d) => <div><span>{d.path}</span></div>) : ''}
        </div>
      </div>
    )
  }
}

Studio.addToolbarComponent((props) => <div className='toolbar-button' onClick={() => Studio.openModal(CommitModal, {entity: props.tab.entity})}>
  <i className='fa fa-git ' />Commit
</div>
)

Studio.addToolbarComponent((props) => <div className='toolbar-button' onClick={() => Studio.openModal(HistoryModal, {entity: props.tab.entity})}>
  <i className='fa fa-git ' />History
</div>
)

async function revert () {
  try {
    await Studio.api.post(`/api/source-control/revert`)
  } catch (e) {
    alert(e)
  }
}

Studio.addToolbarComponent((props) => <div className='toolbar-button' onClick={() => revert()}>
  <i className='fa fa-git ' />Revert
</div>)
