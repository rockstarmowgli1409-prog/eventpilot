import type { Extraction } from "./api";
import { buildSegments, collectQuotes, type Quote } from "./highlight";

const q = (id: string, text: string): Quote => ({ id, text, label: id, tone: "field" });

describe("buildSegments", () => {
  it("returns the whole email as one plain segment when nothing matches", () => {
    const segs = buildSegments("hello world", [q("a", "nope")]);
    expect(segs).toEqual([{ text: "hello world", quotes: [] }]);
  });

  it("wraps a quote and preserves the surrounding text exactly", () => {
    const email = "Tent for $850, deposit by Oct 23.";
    const segs = buildSegments(email, [q("cost", "$850")]);
    expect(segs.map((s) => s.text).join("")).toBe(email);
    expect(segs.find((s) => s.quotes.length)?.text).toBe("$850");
  });

  it("tags the overlap of two quotes with both", () => {
    const segs = buildSegments("abcdef", [q("one", "abcd"), q("two", "cdef")]);
    const overlap = segs.find((s) => s.text === "cd");
    expect(overlap?.quotes.map((x) => x.id).sort()).toEqual(["one", "two"]);
  });

  it("ignores empty quotes", () => {
    expect(buildSegments("abc", [q("e", "")])).toEqual([{ text: "abc", quotes: [] }]);
  });
});

describe("collectQuotes", () => {
  it("collects only non-null evidence with stable ids", () => {
    const empty = { value: null, evidence: null, confidence: 0 };
    const x: Extraction = {
      vendor_name: { value: "A", evidence: "A here", confidence: 1 },
      contact_email: empty,
      event_name: empty,
      event_date: empty,
      costs: [{ label: "tent", amount_cad: 1, evidence: "$1" }, { label: "x", amount_cad: 2, evidence: null }],
      deadlines: [],
      requirements: [],
      action_items: [],
      open_questions: [],
    };
    expect(collectQuotes(x).map((c) => c.id)).toEqual(["vendor_name", "cost:0"]);
  });
});
