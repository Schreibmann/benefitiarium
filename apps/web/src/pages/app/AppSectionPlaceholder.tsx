import { Card, CardBody, CardHeader } from '../../shared/ui/Card.js';
import { EmptyState } from '../../shared/ui/EmptyState.js';

type Props = {
  title: string;
  description: string;
};

export function AppSectionPlaceholder(props: Props) {
  return (
    <Card>
      <CardHeader title={props.title} titleId="app-section-title" />
      <CardBody>
        <EmptyState title={props.title} description={props.description} />
      </CardBody>
    </Card>
  );
}
