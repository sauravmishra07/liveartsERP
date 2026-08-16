import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { createTemplate, listTemplates, listWhatsAppMessages, sendWhatsApp } from '@/api/whatsapp';
import { formatDate, fullName } from '@/lib/format';
import { EmptyState } from '@/components/common/EmptyState';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/layout/PageHeader';
import { Field, FormTextarea } from '@/components/forms/fields';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePagedList } from '../shared/usePagedList';

export default function WhatsAppPage() {
  const qc = useQueryClient();
  const [to, setTo] = useState('');
  const [message, setMessage] = useState('');
  const [addingTemplate, setAddingTemplate] = useState(false);

  const templatesQ = useQuery({ queryKey: ['wa-templates'], queryFn: listTemplates });
  const { q: msgQ, setPage } = usePagedList('wa-messages', listWhatsAppMessages);

  const sendMut = useMutation({
    mutationFn: () => sendWhatsApp({ to: to.trim(), message }),
    onSuccess: () => {
      toast.success('Message sent');
      setMessage('');
      qc.invalidateQueries({ queryKey: ['wa-messages'] });
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <PageHeader
        title="WhatsApp"
        description="Send messages and manage templates"
        actions={<Button variant="outline" onClick={() => setAddingTemplate(true)}>New template</Button>}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader><CardTitle>Send a message</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Field label="Recipient phone" htmlFor="wa-to"><Input id="wa-to" value={to} onChange={(e) => setTo(e.target.value)} placeholder="9998887777" /></Field>
            <FormTextarea label="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={5} />
            {(templatesQ.data || []).length > 0 && (
              <div>
                <div className="text-muted-foreground mb-1 text-xs">Insert template</div>
                <div className="flex flex-wrap gap-1.5">
                  {(templatesQ.data || []).map((t) => (
                    <button key={t._id} type="button" onClick={() => setMessage(t.message)} className="rounded-md border px-2 py-1 text-xs hover:bg-accent">{t.name}</button>
                  ))}
                </div>
              </div>
            )}
            <Button className="w-full" disabled={!to.trim() || !message.trim() || sendMut.isPending} onClick={() => sendMut.mutate()}>
              <Send /> {sendMut.isPending ? 'Sending…' : 'Send'}
            </Button>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 gap-0 overflow-hidden py-0">
          <CardHeader className="p-4"><CardTitle>Message log</CardTitle></CardHeader>
          {(msgQ.data?.items || []).length === 0 ? (
            <EmptyState icon={MessageCircle} title="No messages yet" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>To</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(msgQ.data?.items || []).map((m) => (
                    <TableRow key={m._id}>
                      <TableCell>{m.studentId ? fullName(m.studentId.name) : m.to}</TableCell>
                      <TableCell className="max-w-xs truncate">{m.message}</TableCell>
                      <TableCell><StatusBadge value={m.status} /></TableCell>
                      <TableCell>{formatDate(m.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-muted-foreground flex items-center justify-between border-t p-3 text-sm">
                <span>{msgQ.data?.meta?.total} total</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={(msgQ.data?.meta?.page || 1) <= 1} onClick={() => setPage((msgQ.data.meta.page) - 1)}>Prev</Button>
                  <Button variant="outline" size="sm" disabled={(msgQ.data?.meta?.page || 1) >= (msgQ.data?.meta?.pages || 1)} onClick={() => setPage((msgQ.data.meta.page) + 1)}>Next</Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {addingTemplate && <TemplateDialog onClose={() => setAddingTemplate(false)} onSaved={() => { setAddingTemplate(false); qc.invalidateQueries({ queryKey: ['wa-templates'] }); }} />}
    </div>
  );
}

function TemplateDialog({ onClose, onSaved }) {
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const mut = useMutation({
    mutationFn: () => createTemplate({ name: name.trim(), message }),
    onSuccess: () => { toast.success('Template saved'); onSaved(); },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>New template</DialogTitle></DialogHeader>
        <div className="flex flex-col gap-3">
          <Field label="Name" htmlFor="tpl-name"><Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <FormTextarea label="Message" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={!name.trim() || !message.trim() || mut.isPending} onClick={() => mut.mutate()}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
