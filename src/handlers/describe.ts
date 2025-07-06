// src/handlers/describe.ts
export interface ServerCapabilities {
  experimental?: Record<string, Record<string, any>>;
  logging?: Record<string, any>;
  prompts?: {
    listChanged?: boolean;
  };
  resources?: {
    subscribe?: boolean;
    listChanged?: boolean;
  };
  tools?: {
    listChanged?: boolean;
  };
}

export interface ServerInfo {
  name: string;
  version: string;
  capabilities?: ServerCapabilities;
  instructions?: string;
}

export interface ToolDefinition {
  name: string;
  description?: string;
  inputSchema: any;
  annotations?: any;
}

/**
 * Implements the standard MCP describe endpoint functionality
 * This provides information about the server's capabilities, tools, and metadata
 */
export class DescribeHandler {
  private serverInfo: ServerInfo;
  private tools: ToolDefinition[] = [];

  constructor(serverInfo: ServerInfo) {
    this.serverInfo = serverInfo;
  }

  /**
   * Set the available tools (called after all tools are registered)
   */
  setTools(tools: ToolDefinition[]): void {
    this.tools = tools;
  }

  /**
   * Returns comprehensive server description including capabilities and available tools
   */
  async getServerDescription(): Promise<{
    serverInfo: ServerInfo;
    capabilities: ServerCapabilities;
    tools: Array<{
      name: string;
      description?: string;
      inputSchema: any;
      annotations?: any;
    }>;
    toolsCount: number;
    categories: Array<{
      name: string;
      count: number;
      tools: string[];
    }>;
  }> {
    // Categorize tools by functionality
    const categories = this.categorizeTools(this.tools);

    // Define server capabilities
    const capabilities: ServerCapabilities = {
      tools: {
        listChanged: true
      },
      resources: {
        subscribe: false,
        listChanged: false
      },
      prompts: {
        listChanged: false
      },
      logging: {},
      experimental: {
        ghl: {
          version: "v2021-07-28",
          apiVersion: "2021-07-28",
          supportedFeatures: [
            "contacts",
            "conversations", 
            "opportunities",
            "calendars",
            "invoices",
            "payments",
            "social_media",
            "workflows",
            "custom_objects"
          ]
        }
      }
    };

    return {
      serverInfo: {
        ...this.serverInfo,
        capabilities,
        instructions: `GoHighLevel MCP Server provides comprehensive access to GoHighLevel CRM APIs.
Available categories: ${categories.map(c => c.name).join(', ')}.
Total tools: ${this.tools.length}.
Use tools to manage contacts, send messages, create opportunities, schedule appointments, process payments, and more.`
      },
      capabilities,
      tools: this.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations
      })),
      toolsCount: this.tools.length,
      categories
    };
  }

  /**
   * Categorizes tools by functionality for better organization
   */
  private categorizeTools(tools: ToolDefinition[]): Array<{ name: string; count: number; tools: string[] }> {
    const categories: Record<string, string[]> = {
      'Contact Management': [],
      'Messaging & Communication': [],
      'Sales & Opportunities': [],
      'Calendar & Appointments': [],
      'Payments & Billing': [],
      'Marketing & Social Media': [],
      'Business Operations': [],
      'Custom Objects & Data': [],
      'Other': []
    };

    tools.forEach((tool: ToolDefinition) => {
      const toolName = tool.name.toLowerCase();
      
      if (toolName.includes('contact')) {
        categories['Contact Management'].push(tool.name);
      } else if (toolName.includes('message') || toolName.includes('sms') || toolName.includes('email') || toolName.includes('conversation')) {
        categories['Messaging & Communication'].push(tool.name);
      } else if (toolName.includes('opportunity') || toolName.includes('pipeline')) {
        categories['Sales & Opportunities'].push(tool.name);
      } else if (toolName.includes('calendar') || toolName.includes('appointment') || toolName.includes('event')) {
        categories['Calendar & Appointments'].push(tool.name);
      } else if (toolName.includes('payment') || toolName.includes('invoice') || toolName.includes('billing') || toolName.includes('transaction')) {
        categories['Payments & Billing'].push(tool.name);
      } else if (toolName.includes('social') || toolName.includes('blog') || toolName.includes('media') || toolName.includes('campaign')) {
        categories['Marketing & Social Media'].push(tool.name);
      } else if (toolName.includes('location') || toolName.includes('workflow') || toolName.includes('survey') || toolName.includes('store')) {
        categories['Business Operations'].push(tool.name);
      } else if (toolName.includes('object') || toolName.includes('custom') || toolName.includes('field') || toolName.includes('association')) {
        categories['Custom Objects & Data'].push(tool.name);
      } else {
        categories['Other'].push(tool.name);
      }
    });

    return Object.entries(categories)
      .filter(([_, tools]) => tools.length > 0)
      .map(([name, tools]) => ({
        name,
        count: tools.length,
        tools: tools.sort()
      }));
  }

  /**
   * Gets detailed information about a specific tool
   */
  async getToolDescription(toolName: string): Promise<{
    tool?: ToolDefinition;
    examples?: any[];
    relatedTools?: string[];
    category?: string;
  }> {
    const tool = this.tools.find(t => t.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found`);
    }

    // Generate examples based on tool name and schema
    const examples = this.generateToolExamples(tool);
    
    // Find related tools
    const relatedTools = this.findRelatedTools(tool, this.tools);
    
    // Determine category
    const categories = this.categorizeTools([tool]);
    const category = categories.length > 0 ? categories[0].name : 'Other';

    return {
      tool,
      examples,
      relatedTools,
      category
    };
  }

  /**
   * Generates usage examples for a tool based on its schema
   */
  private generateToolExamples(tool: ToolDefinition): any[] {
    const examples: any[] = [];
    
    // Basic example structure
    const baseExample = {
      tool: tool.name,
      arguments: {}
    };

    // Generate examples based on common patterns
    if (tool.inputSchema?.properties) {
      const properties = tool.inputSchema.properties;
      const requiredFields = tool.inputSchema.required || [];
      
      // Create example with required fields
      const exampleArgs: any = {};
      
      requiredFields.forEach((field: string) => {
        const prop = properties[field];
        if (prop) {
          switch (prop.type) {
            case 'string':
              if (field.includes('email')) exampleArgs[field] = 'user@example.com';
              else if (field.includes('phone')) exampleArgs[field] = '+1234567890';
              else if (field.includes('id')) exampleArgs[field] = 'example_id_123';
              else exampleArgs[field] = 'example_value';
              break;
            case 'number':
              exampleArgs[field] = field.includes('amount') ? 100.00 : 1;
              break;
            case 'boolean':
              exampleArgs[field] = true;
              break;
            case 'object':
              exampleArgs[field] = {};
              break;
            case 'array':
              exampleArgs[field] = [];
              break;
          }
        }
      });

      examples.push({
        ...baseExample,
        arguments: exampleArgs
      });
    }

    return examples;
  }

  /**
   * Finds tools related to the current tool based on naming patterns
   */
  private findRelatedTools(currentTool: ToolDefinition, allTools: ToolDefinition[]): string[] {
    const currentName = currentTool.name.toLowerCase();
    const related: string[] = [];

    // Extract base entity from tool name (e.g., 'contact' from 'create_contact')
    const entityMatch = currentName.match(/(contact|conversation|opportunity|appointment|invoice|payment|social|workflow|object|location|blog)/);
    const entity = entityMatch ? entityMatch[1] : null;

    if (entity) {
      allTools.forEach((tool: ToolDefinition) => {
        if (tool.name !== currentTool.name && tool.name.toLowerCase().includes(entity)) {
          related.push(tool.name);
        }
      });
    }

    return related.slice(0, 5); // Limit to 5 related tools
  }
}