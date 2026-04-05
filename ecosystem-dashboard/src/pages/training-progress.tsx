/**
 * Training Progress Page
 * Full-page view of active training job with real-time charts
 */

import React from "react";
import { Box } from "@chakra-ui/react";
import TrainingProgressChart from "@/components/ml-training/TrainingProgressChart";

export default function TrainingProgressPage() {
  return (
    <Box minH="100vh" bg="gray.50" _dark={{ bg: "gray.900" }}>
      <TrainingProgressChart />
    </Box>
  );
}
