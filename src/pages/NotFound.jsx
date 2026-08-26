import StatusPage from '../components/StatusPage.jsx'

export default function NotFound() {
  return (
    <StatusPage
      code="404"
      eyebrow="Page Not Found"
      title="You're on the wrong page"
      description="The page you're looking for doesn't exist or has been moved."
      primaryAction={{ label: 'Back to Homepage', href: '/' }}
      secondaryAction={{ label: 'Visit Official Site', href: 'https://lilco.eu', external: true }}
    />
  )
}
