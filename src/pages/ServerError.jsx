import StatusPage from '../components/StatusPage.jsx'

export default function ServerError() {
  return (
    <StatusPage
      code="500"
      eyebrow="Something Went Wrong"
      title="An unexpected error occurred"
      description="Please try again in a moment."
      primaryAction={{ label: 'Back to Homepage', href: '/' }}
      secondaryAction={{ label: 'Visit Official Site', href: 'https://lilco.eu', external: true }}
    />
  )
}
