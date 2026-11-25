import { GenerationProvider } from "./types";
import { MockGenerationProvider } from "./mock-provider";

let activeProvider: GenerationProvider = new MockGenerationProvider();

export function getGenerationProvider(): GenerationProvider {
  return activeProvider;
}

export function setGenerationProvider(provider: GenerationProvider): void {
  activeProvider = provider;
}
