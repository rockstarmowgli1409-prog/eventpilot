import { render, screen } from "@testing-library/react";
import FieldCard from "./FieldCard";

describe("FieldCard", () => {
  it("shows value, confidence and the evidence quote", () => {
    render(
      <FieldCard
        label="Vendor"
        field={{ value: "Harbour Tents", evidence: "Harbour Tents here", confidence: 0.92 }}
      />,
    );
    expect(screen.getByText("Harbour Tents")).toBeInTheDocument();
    expect(screen.getByText("92% confident")).toBeInTheDocument();
    expect(screen.getByText("Harbour Tents here").tagName).toBe("MARK");
  });

  it("says so when the field is missing instead of guessing", () => {
    render(<FieldCard label="Event date" field={{ value: null, evidence: null, confidence: 0 }} />);
    expect(screen.getByText("Not found in email")).toBeInTheDocument();
    expect(screen.queryByText(/confident/)).toBeNull();
  });
});
