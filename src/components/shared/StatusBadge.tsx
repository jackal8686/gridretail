import React from "react";
import { Badge } from "@/components/ui/Badge";
import { StoreStatus } from "@/types";

interface StatusBadgeProps {
  status: StoreStatus | string;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  switch (status) {
    case "Published":
    case "Approved":
    case "Active":
    case "In Stock":
      return (
        <Badge variant="success" size={size} dot>
          {status}
        </Badge>
      );
    case "In Progress":
    case "Low Stock":
      return (
        <Badge variant="brand" size={size} dot>
          {status}
        </Badge>
      );
    case "Pending Review":
    case "Prospect":
      return (
        <Badge variant="warning" size={size} dot>
          {status}
        </Badge>
      );
    case "Changes Requested":
      return (
        <Badge variant="error" size={size} dot>
          {status}
        </Badge>
      );
    case "Draft":
    case "Archived":
    case "Out of Stock":
      return (
        <Badge variant="neutral" size={size} dot>
          {status}
        </Badge>
      );
    default:
      return (
        <Badge variant="neutral" size={size}>
          {status}
        </Badge>
      );
  }
}
