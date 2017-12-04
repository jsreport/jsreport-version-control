
import Studio from 'jsreport-studio'
import { Diff2Html } from 'diff2html'
import diffStyle from './diff.css.js'

const openDiff = (patch) => {
  const style = '<style>' + diffStyle + '</style>'
  const diff = Diff2Html.getPrettyHtml(patch, {inputFormat: 'diff', showFiles: false, matching: 'lines'})
  const html = `<html><head>${style}</head><body>${diff}</body></html>`
  Studio.setPreviewFrameSrc('data:text/html;charset=utf-8,' + encodeURIComponent(style + html))
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
    </tr>
    {c.operation === 'remove' ? null : c.patch.documentProperties.map((p) => <tr key={p.path} onClick={() => openDiff(p.patch)}>
      <td style={{textAlign: 'center'}}><i className={operationIcon(c.operation)} /></td>
      <td>{c.path}/{p.path}</td>
    </tr>)}
  </tbody>)
}

export default ({ changes }) => (<table className='table'>
  <thead>
    <tr>
      <th style={{width: '20px'}}>operation</th>
      <th>path</th>
    </tr>
  </thead>
  {changes.map((c) => renderChange(c))}
</table>
)
