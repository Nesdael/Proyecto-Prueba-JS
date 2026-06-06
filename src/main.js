import { router } from '../src/routes/routes.js'

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode')
    }
    router.init()
})