import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

// Import a representative subset of UI primitives to verify no runtime errors
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

describe("UI components smoke tests", () => {
  it("Button renders", () => {
    render(<Button>Test</Button>);
    expect(screen.getByRole("button", { name: /test/i })).toBeInTheDocument();
  });

  it("Spinner renders", () => {
    render(<Spinner />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("Empty renders", () => {
    render(
      <Empty>
        <EmptyTitle>Title</EmptyTitle>
        <EmptyDescription>Desc</EmptyDescription>
      </Empty>
    );
    expect(screen.getByText("Title")).toBeInTheDocument();
  });

  it("Input renders", () => {
    render(<Input placeholder="Type here" />);
    expect(screen.getByPlaceholderText("Type here")).toBeInTheDocument();
  });

  it("Label renders", () => {
    render(<Label htmlFor="x">Name</Label>);
    expect(screen.getByText("Name")).toBeInTheDocument();
  });

  it("Textarea renders", () => {
    render(<Textarea placeholder="Notes" />);
    expect(screen.getByPlaceholderText("Notes")).toBeInTheDocument();
  });

  it("Badge renders", () => {
    render(<Badge>Beta</Badge>);
    expect(screen.getByText("Beta")).toBeInTheDocument();
  });

  it("Avatar renders", () => {
    render(
      <Avatar>
        <AvatarFallback>JD</AvatarFallback>
      </Avatar>
    );
    expect(screen.getByText("JD")).toBeInTheDocument();
  });

  it("Separator renders", () => {
    const { container } = render(<Separator />);
    expect(container.querySelector("[data-slot='separator']")).toBeInTheDocument();
  });

  it("Skeleton renders", () => {
    const { container } = render(<Skeleton className="h-4 w-20" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it("Switch renders", () => {
    render(<Switch aria-label="Toggle" />);
    expect(screen.getByRole("switch", { name: /toggle/i })).toBeInTheDocument();
  });

  it("Checkbox renders", () => {
    render(<Checkbox aria-label="Check" />);
    expect(screen.getByRole("checkbox", { name: /check/i })).toBeInTheDocument();
  });

  it("RadioGroup renders", () => {
    render(
      <RadioGroup defaultValue="a">
        <RadioGroupItem value="a" id="r1" />
        <RadioGroupItem value="b" id="r2" />
      </RadioGroup>
    );
    expect(screen.getAllByRole("radio").length).toBe(2);
  });

  it("Tabs render", () => {
    render(
      <Tabs defaultValue="tab1">
        <TabsList>
          <TabsTrigger value="tab1">One</TabsTrigger>
          <TabsTrigger value="tab2">Two</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content One</TabsContent>
        <TabsContent value="tab2">Content Two</TabsContent>
      </Tabs>
    );
    expect(screen.getByRole("tab", { name: /one/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /two/i })).toBeInTheDocument();
    expect(screen.getByText("Content One")).toBeInTheDocument();
  });

  it("Card renders", () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
        </CardHeader>
        <CardContent>Card body</CardContent>
      </Card>
    );
    expect(screen.getByText("Card Title")).toBeInTheDocument();
    expect(screen.getByText("Card body")).toBeInTheDocument();
  });
});
