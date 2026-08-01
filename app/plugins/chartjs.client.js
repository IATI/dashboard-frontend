import {
  Chart as ChartJS,
  CategoryScale, LinearScale, LogarithmicScale,
  PointElement, LineElement, BarElement, ArcElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js'

export default defineNuxtPlugin(() => {
  ChartJS.register(
    CategoryScale, LinearScale, LogarithmicScale,
    PointElement, LineElement, BarElement, ArcElement,
    Title, Tooltip, Legend, Filler,
  )
})
