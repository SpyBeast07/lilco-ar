import StatusPage from '../components/StatusPage.jsx'

export default function Maintenance() {
  return (
    <StatusPage
      code="503"
      eyebrow="Under Maintenance"
      title="We'll be back soon"
      description="The site is down for maintenance. Please check back shortly."
      primaryAction={{ label: 'Back to Homepage', href: '/' }}
      secondaryAction={{ label: 'Visit Official Site', href: 'https://lilco.eu', external: true }}
    />
  )
}
