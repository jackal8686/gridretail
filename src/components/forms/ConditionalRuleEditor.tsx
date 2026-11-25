import React from "react";
import { FormField, FieldCondition, ConditionOperator } from "@/types/lead";
import { Trash2, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface ConditionalRuleEditorProps {
  field: FormField;
  allFields: FormField[];
  onChange: (conditions: FieldCondition[], logic: "and" | "or") => void;
}

const OPERATORS: { value: ConditionOperator; label: string; needsValue: boolean }[] = [
  { value: "equals", label: "Equals", needsValue: true },
  { value: "not_equals", label: "Does not equal", needsValue: true },
  { value: "contains", label: "Contains", needsValue: true },
  { value: "is_empty", label: "Is empty", needsValue: false },
  { value: "is_not_empty", label: "Is not empty", needsValue: false },
];

export const ConditionalRuleEditor: React.FC<ConditionalRuleEditorProps> = ({
  field,
  allFields,
  onChange,
}) => {
  const availableTargetFields = allFields.filter((f) => f.id !== field.id);
  const conditions = field.conditions || [];
  const logic = field.conditionLogic || "and";

  const handleAddCondition = () => {
    if (availableTargetFields.length === 0) return;
    const firstTarget = availableTargetFields[0];
    const newCond: FieldCondition = {
      fieldId: firstTarget.id,
      operator: "equals",
      value: "",
    };
    onChange([...conditions, newCond], logic);
  };

  const handleRemoveCondition = (index: number) => {
    const updated = conditions.filter((_, idx) => idx !== index);
    onChange(updated, logic);
  };

  const handleUpdateCondition = (index: number, patch: Partial<FieldCondition>) => {
    const updated = conditions.map((cond, idx) => {
      if (idx === index) {
        return { ...cond, ...patch };
      }
      return cond;
    });
    onChange(updated, logic);
  };

  return (
    <div className="space-y-3 p-3.5 rounded-xl border border-[#E4E9E5] bg-[#FAF9F6]">
      <div className="flex items-center justify-between">
        <div>
          <h5 className="text-xs font-bold text-[#18231E]">Conditional Visibility Rules</h5>
          <p className="text-[10px] text-[#66736C]">
            Only show this field when preceding answers match your rules.
          </p>
        </div>
        {conditions.length > 1 && (
          <div className="flex items-center gap-1.5 bg-white border border-[#E4E9E5] rounded-lg p-0.5 text-[10px]">
            <button
              type="button"
              onClick={() => onChange(conditions, "and")}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                logic === "and" ? "bg-[#176B4D] text-white" : "text-[#66736C]"
              }`}
            >
              AND
            </button>
            <button
              type="button"
              onClick={() => onChange(conditions, "or")}
              className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                logic === "or" ? "bg-[#176B4D] text-white" : "text-[#66736C]"
              }`}
            >
              OR
            </button>
          </div>
        )}
      </div>

      {availableTargetFields.length === 0 ? (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Add other fields to this step before adding conditional rules.</span>
        </div>
      ) : (
        <div className="space-y-2">
          {conditions.map((cond, index) => {
            const targetField = allFields.find((f) => f.id === cond.fieldId);
            const opConfig = OPERATORS.find((o) => o.value === cond.operator);
            return (
              <div
                key={index}
                className="grid grid-cols-12 gap-2 items-center bg-white p-2.5 rounded-lg border border-[#E4E9E5]"
              >
                <div className="col-span-4">
                  <select
                    value={cond.fieldId}
                    onChange={(e) => handleUpdateCondition(index, { fieldId: e.target.value })}
                    className="w-full text-xs rounded border border-[#E4E9E5] px-2 py-1.5 focus:outline-hidden"
                  >
                    {availableTargetFields.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-3">
                  <select
                    value={cond.operator}
                    onChange={(e) =>
                      handleUpdateCondition(index, { operator: e.target.value as ConditionOperator })
                    }
                    className="w-full text-xs rounded border border-[#E4E9E5] px-2 py-1.5 focus:outline-hidden"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-span-4">
                  {opConfig?.needsValue ? (
                    targetField?.options && targetField.options.length > 0 ? (
                      <select
                        value={cond.value || ""}
                        onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                        className="w-full text-xs rounded border border-[#E4E9E5] px-2 py-1.5 focus:outline-hidden"
                      >
                        <option value="">Select expected option...</option>
                        {targetField.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={cond.value || ""}
                        onChange={(e) => handleUpdateCondition(index, { value: e.target.value })}
                        placeholder="Expected value"
                        className="w-full text-xs rounded border border-[#E4E9E5] px-2 py-1.5 focus:outline-hidden"
                      />
                    )
                  ) : (
                    <span className="text-[11px] text-[#909D96] italic px-1">No value needed</span>
                  )}
                </div>

                <div className="col-span-1 text-right">
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(index)}
                    className="p-1 text-[#909D96] hover:text-[#C43D3D] rounded transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddCondition}
            leftIcon={<Plus className="h-3.5 w-3.5" />}
            className="w-full text-xs"
          >
            Add Condition Rule
          </Button>
        </div>
      )}
    </div>
  );
};
