
import Studio from 'jsreport-studio'

const openDiff = async (patch) => {
  const res = await Studio.api.post('/api/version-control/diff-html', {
    data: {
      patch: patch
    },
    parseJSON: false
  })
  Studio.setPreviewFrameSrc('data:text/html;charset=utf-8,' + encodeURIComponent(res))
}

const operationIcon = (operation) => {
  switch (operation) {
    case 'insert': return 'fa fa-plus'
    case 'remove': return 'fa fa-eraser'
    case 'update': return 'fa fa-pencil'
  }
}

const renderChange = (c) => {
  return (<tbody key={c.entitySet + c.path}>
    <tr onClick={() => openDiff(c.patch.config)}>
      <td style={{textAlign: 'center'}}><i className={operationIcon(c.operation)} /></td>
      <td>{c.path}</td>
      <td>{c.entitySet}</td>
    </tr>
    {c.operation === 'remove' ? null : c.patch.documentProperties.map((p) => <tr key={p.path} onClick={() => openDiff(p.patch)}>
      <td style={{textAlign: 'center'}}><i className={operationIcon(c.operation)} /></td>
      <td>{c.path}/{p.path}</td>
      <td>{c.entitySet}</td>
    </tr>)}
  </tbody>)
}

export default ({ changes }) => (<table className='table'>
  <thead>
    <tr>
      <th style={{width: '20px'}}>operation</th>
      <th>path</th>
      <th>entity set</th>
    </tr>
  </thead>
  {changes.map((c) => renderChange(c))}
</table>
)
