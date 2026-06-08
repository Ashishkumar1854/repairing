import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export function NotFoundPage() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle>Page not found</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-[var(--muted)]">The ERP screen you requested does not exist or has moved.</p>
          <Link to="/dashboard"><Button>Go to Dashboard</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}

export function UnauthorizedPage() {
  return (
    <div className="grid min-h-[70vh] place-items-center">
      <Card className="w-full max-w-lg">
        <CardHeader><CardTitle>Unauthorized</CardTitle></CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-[var(--muted)]">Your current role does not have access to this ERP action.</p>
          <Link to="/dashboard"><Button>Back to Dashboard</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}
