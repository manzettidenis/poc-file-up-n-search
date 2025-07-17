/* @refresh reload */
import { render } from 'solid-js/web'
import './index.css'
import App from './features/app/App'

const root = document.getElementById('root')

render(() => <App />, root!)
