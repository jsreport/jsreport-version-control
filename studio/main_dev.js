import Studio from 'jsreport-studio'
import React from 'react'
import HistoryEditor from './HistoryEditor'

class CommitModal extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      message: ''
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

Studio.addEditorComponent('versionControlHistory', HistoryEditor)

Studio.addToolbarComponent((props) => <div className='toolbar-button' onClick={() => Studio.openModal(CommitModal)}>
  <i className='fa fa-git ' />Commit
</div>
)

Studio.addToolbarComponent((props) => <div className='toolbar-button' onClick={() =>
  Studio.openTab({ key: 'versionControlHistory', editorComponentKey: 'versionControlHistory', title: 'Commits history' })}>
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
