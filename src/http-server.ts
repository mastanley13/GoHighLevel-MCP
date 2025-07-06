/**
	* GoHighLevel MCP HTTP Server - Simplified version
	* HTTP version for ChatGPT web integration with manual describe endpoints
*/

import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { 
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError 
} from '@modelcontextprotocol/sdk/types.js';
import * as dotenv from 'dotenv';

import { GHLApiClient } from './clients/ghl-api-client.js';
import { ContactTools } from './tools/contact-tools.js';
import { ConversationTools } from './tools/conversation-tools.js';
import { BlogTools } from './tools/blog-tools.js';
import { OpportunityTools } from './tools/opportunity-tools.js';
import { CalendarTools } from './tools/calendar-tools.js';
import { EmailTools } from './tools/email-tools.js';
import { LocationTools } from './tools/location-tools.js';
import { EmailISVTools } from './tools/email-isv-tools.js';
import { SocialMediaTools } from './tools/social-media-tools.js';
import { MediaTools } from './tools/media-tools.js';
import { ObjectTools } from './tools/object-tools.js';
import { AssociationTools } from './tools/association-tools.js';
import { CustomFieldV2Tools } from './tools/custom-field-v2-tools.js';
import { WorkflowTools } from './tools/workflow-tools.js';
import { SurveyTools } from './tools/survey-tools.js';
import { StoreTools } from './tools/store-tools.js';
import { ProductsTools } from './tools/products-tools.js';
import { PaymentsTools } from './tools/payments-tools.js';
import { InvoicesTools } from './tools/invoices-tools.js';
import { GHLConfig } from './types/ghl-types.js';

// Load environment variables
dotenv.config();

/**
	* HTTP MCP Server class for web deployment
*/
class GHLMCPHttpServer {
	private app: express.Application;
	private server: Server;
	private ghlClient: GHLApiClient;
	
	// Tool instances
	private contactTools!: ContactTools;
	private conversationTools!: ConversationTools;
	private blogTools!: BlogTools;
	private opportunityTools!: OpportunityTools;
	private calendarTools!: CalendarTools;
	private emailTools!: EmailTools;
	private locationTools!: LocationTools;
	private emailISVTools!: EmailISVTools;
	private socialMediaTools!: SocialMediaTools;
	private mediaTools!: MediaTools;
	private objectTools!: ObjectTools;
	private associationTools!: AssociationTools;
	private customFieldV2Tools!: CustomFieldV2Tools;
	private workflowTools!: WorkflowTools;
	private surveyTools!: SurveyTools;
	private storeTools!: StoreTools;
	private productsTools!: ProductsTools;
	private paymentsTools!: PaymentsTools;
	private invoicesTools!: InvoicesTools;
	
	private port: number;
	
	constructor() {
		this.port = parseInt(process.env.PORT || process.env.MCP_SERVER_PORT || '8000');
		
		// Initialize Express app
		this.app = express();
		this.setupExpress();
		
		// Initialize MCP server with enhanced capabilities
		this.server = new Server(
			{
				name: 'GoHighLevel MCP Server',
				version: '1.0.0',
			},
			{
				capabilities: {
					tools: { listChanged: true },
					resources: { subscribe: false, listChanged: false },
					prompts: { listChanged: false },
					experimental: {
						ghl: {
							version: 'v2021-07-28',
							apiVersion: '2021-07-28',
							supportedFeatures: [
								'contacts', 'conversations', 'opportunities', 'calendars',
								'invoices', 'payments', 'social_media', 'workflows', 'custom_objects'
							]
						}
					}
				},
			}
		);
		
		// Initialize GHL API client
		this.ghlClient = this.initializeGHLClient();
		
		// Initialize all tools
		this.initializeTools();
		
		// Setup MCP handlers
		this.setupMCPHandlers();
		this.setupRoutes();
	}
	
	/**
		* Initialize all tool classes
	*/
	private initializeTools(): void {
		this.contactTools = new ContactTools(this.ghlClient);
		this.conversationTools = new ConversationTools(this.ghlClient);
		this.blogTools = new BlogTools(this.ghlClient);
		this.opportunityTools = new OpportunityTools(this.ghlClient);
		this.calendarTools = new CalendarTools(this.ghlClient);
		this.emailTools = new EmailTools(this.ghlClient);
		this.locationTools = new LocationTools(this.ghlClient);
		this.emailISVTools = new EmailISVTools(this.ghlClient);
		this.socialMediaTools = new SocialMediaTools(this.ghlClient);
		this.mediaTools = new MediaTools(this.ghlClient);
		this.objectTools = new ObjectTools(this.ghlClient);
		this.associationTools = new AssociationTools(this.ghlClient);
		this.customFieldV2Tools = new CustomFieldV2Tools(this.ghlClient);
		this.workflowTools = new WorkflowTools(this.ghlClient);
		this.surveyTools = new SurveyTools(this.ghlClient);
		this.storeTools = new StoreTools(this.ghlClient);
		this.productsTools = new ProductsTools(this.ghlClient);
		this.paymentsTools = new PaymentsTools(this.ghlClient);
		this.invoicesTools = new InvoicesTools(this.ghlClient);
	}
	
	/**
		* Setup Express middleware and configuration
	*/
	private setupExpress(): void {
		// Enable CORS for ChatGPT integration and other MCP clients
		this.app.use(cors({
			origin: [
				'https://chatgpt.com', 
				'https://chat.openai.com',
				'https://claude.ai',
				'https://console.anthropic.com',
				/^http:\/\/localhost:\d+$/,
				/^https:\/\/.*\.vercel\.app$/,
				/^https:\/\/.*\.netlify\.app$/
			],
			methods: ['GET', 'POST', 'OPTIONS'],
			allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Cache-Control'],
			credentials: true
		}));
		
		// Parse JSON requests
		this.app.use(express.json({ limit: '10mb' }));
		
		// Request logging
		this.app.use((req, res, next) => {
			console.log(`[HTTP] ${req.method} ${req.path} - ${new Date().toISOString()}`);
			next();
		});
		
		// Error handling middleware
		this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
			console.error(`[HTTP] Error handling ${req.method} ${req.path}:`, error);
			if (!res.headersSent) {
				res.status(500).json({ error: 'Internal server error', message: error.message });
			}
		});
	}
	
	/**
		* Initialize GoHighLevel API client with configuration
	*/
	private initializeGHLClient(): GHLApiClient {
		const config: GHLConfig = {
			accessToken: process.env.GHL_API_KEY || '',
			baseUrl: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com',
			version: '2021-07-28',
			locationId: process.env.GHL_LOCATION_ID || ''
		};
		
		if (!config.accessToken) {
			throw new Error('GHL_API_KEY environment variable is required');
		}
		
		if (!config.locationId) {
			throw new Error('GHL_LOCATION_ID environment variable is required');
		}
		
		console.log('[GHL MCP HTTP] Initializing GHL API client...');
		console.log(`[GHL MCP HTTP] Base URL: ${config.baseUrl}`);
		console.log(`[GHL MCP HTTP] Version: ${config.version}`);
		console.log(`[GHL MCP HTTP] Location ID: ${config.locationId}`);
		
		return new GHLApiClient(config);
	}
	
	/**
		* Get all tools for categorization
	*/
	private getAllTools() {
		return [
			...this.contactTools.getToolDefinitions(),
			...this.conversationTools.getToolDefinitions(),
			...this.blogTools.getToolDefinitions(),
			...this.opportunityTools.getToolDefinitions(),
			...this.calendarTools.getToolDefinitions(),
			...this.emailTools.getToolDefinitions(),
			...this.locationTools.getToolDefinitions(),
			...this.emailISVTools.getToolDefinitions(),
			...this.socialMediaTools.getTools(),
			...this.mediaTools.getToolDefinitions(),
			...this.objectTools.getToolDefinitions(),
			...this.associationTools.getTools(),
			...this.customFieldV2Tools.getTools(),
			...this.workflowTools.getTools(),
			...this.surveyTools.getTools(),
			...this.storeTools.getTools(),
			...this.productsTools.getTools(),
			...this.paymentsTools.getTools(),
			...this.invoicesTools.getTools()
		];
	}
	
	/**
		* Categorize tools manually
	*/
	private categorizeTools(tools: any[]) {
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
		
		tools.forEach(tool => {
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
		* Setup MCP request handlers
	*/
	private setupMCPHandlers(): void {
		// Handle list tools requests with enhanced metadata
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			console.log('[GHL MCP HTTP] Listing available tools...');
			
			try {
				const allTools = this.getAllTools();
				const categories = this.categorizeTools(allTools);
				
				console.log(`[GHL MCP HTTP] Registered ${allTools.length} tools total`);
				
				return {
					tools: allTools,
					_meta: {
						totalCount: allTools.length,
						categories: categories,
						serverInfo: {
							name: 'GoHighLevel MCP Server',
							version: '1.0.0'
						}
					}
				};
				} catch (error) {
				console.error('[GHL MCP HTTP] Error listing tools:', error);
				throw new McpError(
					ErrorCode.InternalError,
					`Failed to list tools: ${error}`
				);
			}
		});
		
		// Handle tool execution requests
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;
			
			console.log(`[GHL MCP HTTP] Executing tool: ${name}`);
			
			try {
				let result: any;
				
				// Route to appropriate tool handler
				if (this.isContactTool(name)) {
					result = await this.contactTools.executeTool(name, args || {});
					} else if (this.isConversationTool(name)) {
					result = await this.conversationTools.executeTool(name, args || {});
					} else if (this.isBlogTool(name)) {
					result = await this.blogTools.executeTool(name, args || {});
					} else if (this.isOpportunityTool(name)) {
					result = await this.opportunityTools.executeTool(name, args || {});
					} else if (this.isCalendarTool(name)) {
					result = await this.calendarTools.executeTool(name, args || {});
					} else if (this.isEmailTool(name)) {
					result = await this.emailTools.executeTool(name, args || {});
					} else if (this.isLocationTool(name)) {
					result = await this.locationTools.executeTool(name, args || {});
					} else if (this.isEmailISVTool(name)) {
					result = await this.emailISVTools.executeTool(name, args || {});
					} else if (this.isSocialMediaTool(name)) {
					result = await this.socialMediaTools.executeTool(name, args || {});
					} else if (this.isMediaTool(name)) {
					result = await this.mediaTools.executeTool(name, args || {});
					} else if (this.isObjectTool(name)) {
					result = await this.objectTools.executeTool(name, args || {});
					} else if (this.isAssociationTool(name)) {
					result = await this.associationTools.executeAssociationTool(name, args || {});
					} else if (this.isCustomFieldV2Tool(name)) {
					result = await this.customFieldV2Tools.executeCustomFieldV2Tool(name, args || {});
					} else if (this.isWorkflowTool(name)) {
					result = await this.workflowTools.executeWorkflowTool(name, args || {});
					} else if (this.isSurveyTool(name)) {
					result = await this.surveyTools.executeSurveyTool(name, args || {});
					} else if (this.isStoreTool(name)) {
					result = await this.storeTools.executeStoreTool(name, args || {});
					} else if (this.isProductsTool(name)) {
					result = await this.productsTools.executeProductsTool(name, args || {});
					} else if (this.isPaymentsTool(name)) {
					result = await this.paymentsTools.handleToolCall(name, args || {});
					} else if (this.isInvoicesTool(name)) {
					result = await this.invoicesTools.handleToolCall(name, args || {});
					} else {
					throw new Error(`Unknown tool: ${name}`);
				}
				
				console.log(`[GHL MCP HTTP] Tool ${name} executed successfully`);
				
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify(result, null, 2)
						}
					]
				};
				} catch (error) {
				console.error(`[GHL MCP HTTP] Error executing tool ${name}:`, error);
				
				const errorCode = error instanceof Error && error.message.includes('404') 
				? ErrorCode.InvalidRequest 
				: ErrorCode.InternalError;
				
				throw new McpError(
					errorCode,
					`Tool execution failed: ${error}`
				);
			}
		});
	}
	
	/**
		* Setup HTTP routes
	*/
	private setupRoutes(): void {
		// Manual describe endpoint 
		this.app.get('/describe', async (req, res) => {
			try {
				const allTools = this.getAllTools();
				const categories = this.categorizeTools(allTools);
				
				const serverInfo = {
					name: 'GoHighLevel MCP Server',
					version: '1.0.0',
					capabilities: {
						tools: { listChanged: true },
						resources: { subscribe: false, listChanged: false },
						prompts: { listChanged: false },
						experimental: {
							ghl: {
								version: 'v2021-07-28',
								supportedFeatures: ['contacts', 'conversations', 'opportunities', 'calendars', 'invoices', 'payments']
							}
						}
					},
					instructions: 'GoHighLevel MCP Server provides comprehensive access to GoHighLevel CRM APIs. Use tools to manage contacts, send messages, create opportunities, and more.'
				};
				
				res.json({
					serverInfo,
					toolsCount: allTools.length,
					categories,
					tools: allTools.map(tool => ({
						name: tool.name,
						description: tool.description,
						inputSchema: tool.inputSchema
					}))
				});
				} catch (error) {
				console.error('[HTTP] Error in /describe:', error);
				res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
			}
		});
		
		// Tool-specific describe endpoint
		// Tool-specific describe endpoint
		this.app.get('/describe/tool/:toolName', (req, res) => {
			try {
				const { toolName } = req.params;
				const allTools = this.getAllTools();
				const tool = allTools.find(t => t.name === toolName);
				
				if (!tool) {
					res.status(404).json({ error: `Tool '${toolName}' not found` });
					return;
				}
				
				res.json({
					tool,
					examples: [{ tool: tool.name, arguments: {} }],
					relatedTools: [],
					category: this.getToolCategory(toolName)
				});
				} catch (error) {
				res.status(404).json({ error: 'Tool not found' });
			}
		});
		
		// Enhanced health check endpoint
		this.app.get('/health', async (req, res) => {
			try {
				const allTools = this.getAllTools();
				const categories = this.categorizeTools(allTools);
				
				res.json({ 
					status: 'healthy',
					server: 'GoHighLevel MCP Server',
					version: '1.0.0',
					toolsCount: allTools.length,
					timestamp: new Date().toISOString(),
					categories: categories.map(c => ({ name: c.name, count: c.count })),
					endpoints: {
						describe: '/describe',
						'describe-tool': '/describe/tool/:toolName',
						health: '/health',
						capabilities: '/capabilities',
						tools: '/tools',
						sse: '/sse'
					}
				});
				} catch (error) {
				res.status(500).json({ 
					status: 'unhealthy', 
					error: error instanceof Error ? error.message : 'Unknown error' 
				});
			}
		});
		
		// MCP capabilities endpoint
		this.app.get('/capabilities', async (req, res) => {
			try {
				const allTools = this.getAllTools();
				
				res.json({
					capabilities: {
						tools: { listChanged: true },
						resources: { subscribe: false, listChanged: false },
						prompts: { listChanged: false }
					},
					server: {
						name: 'GoHighLevel MCP Server',
						version: '1.0.0'
					},
					toolsCount: allTools.length
				});
				} catch (error) {
				res.status(500).json({ error: 'Failed to get capabilities' });
			}
		});
		
		// Enhanced tools listing endpoint
		this.app.get('/tools', async (req, res) => {
			try {
				const allTools = this.getAllTools();
				const categories = this.categorizeTools(allTools);
				
				res.json({
					tools: allTools,
					count: allTools.length,
					categories,
					serverInfo: {
						name: 'GoHighLevel MCP Server',
						version: '1.0.0'
					}
				});
				} catch (error) {
				console.error('[HTTP] Error in /tools:', error);
				res.status(500).json({ error: 'Failed to list tools' });
			}
		});
		
		// SSE endpoint for MCP connection
		const handleSSE = async (req: express.Request, res: express.Response) => {
			const sessionId = req.query.sessionId || 'unknown';
			console.log(`[GHL MCP HTTP] New SSE connection from: ${req.ip}, sessionId: ${sessionId}, method: ${req.method}`);
			
			try {
				const transport = new SSEServerTransport('/sse', res);
				await this.server.connect(transport);
				
				console.log(`[GHL MCP HTTP] SSE connection established for session: ${sessionId}`);
				
				req.on('close', () => {
					console.log(`[GHL MCP HTTP] SSE connection closed for session: ${sessionId}`);
				});
				
				} catch (error) {
				console.error(`[GHL MCP HTTP] SSE connection error for session ${sessionId}:`, error);
				
				if (!res.headersSent) {
					res.status(500).json({ error: 'Failed to establish SSE connection' });
					} else {
					res.end();
				}
			}
		};
		
		this.app.get('/sse', handleSSE);
		this.app.post('/sse', handleSSE);
		
		// Root endpoint with enhanced server info
		this.app.get('/', async (req, res) => {
			try {
				const allTools = this.getAllTools();
				const categories = this.categorizeTools(allTools);
				
				res.json({
					name: 'GoHighLevel MCP Server',
					version: '1.0.0',
					status: 'running',
					description: 'GoHighLevel MCP Server with comprehensive CRM API access',
					endpoints: {
						describe: '/describe',
						'describe-tool': '/describe/tool/:toolName',
						health: '/health',
						capabilities: '/capabilities',
						tools: '/tools',
						sse: '/sse'
					},
					toolsCount: allTools.length,
					categories: categories.map(c => ({ name: c.name, count: c.count })),
					documentation: 'https://github.com/ken-aus/GoHighLevel-MCP'
				});
				} catch (error) {
				res.status(500).json({ error: 'Failed to get server info' });
			}
		});
	}
	
	/**
		* Helper methods
	*/
	private generateExampleArgs(tool: any): any {
		const args: any = {};
		if (tool.inputSchema?.properties) {
			const required = tool.inputSchema.required || [];
			required.forEach((field: string) => {
				if (field.includes('email')) args[field] = 'user@example.com';
				else if (field.includes('phone')) args[field] = '+1234567890';
				else if (field.includes('id')) args[field] = 'example_id_123';
				else args[field] = 'example_value';
			});
		}
		return args;
	}
	
	private getToolCategory(toolName: string): string {
		const name = toolName.toLowerCase();
		if (name.includes('contact')) return 'Contact Management';
		if (name.includes('message') || name.includes('sms') || name.includes('email') || name.includes('conversation')) return 'Messaging & Communication';
		if (name.includes('opportunity') || name.includes('pipeline')) return 'Sales & Opportunities';
		if (name.includes('calendar') || name.includes('appointment')) return 'Calendar & Appointments';
		if (name.includes('payment') || name.includes('invoice') || name.includes('billing')) return 'Payments & Billing';
		if (name.includes('social') || name.includes('blog') || name.includes('media')) return 'Marketing & Social Media';
		if (name.includes('location') || name.includes('workflow') || name.includes('survey') || name.includes('store')) return 'Business Operations';
		if (name.includes('object') || name.includes('custom') || name.includes('field') || name.includes('association')) return 'Custom Objects & Data';
		return 'Other';
	}
	
	// Tool validation methods (keeping your existing logic)
	private isContactTool(toolName: string): boolean {
		const contactToolNames = [
			'create_contact', 'search_contacts', 'get_contact', 'update_contact',
			'add_contact_tags', 'remove_contact_tags', 'delete_contact',
			'get_contact_tasks', 'create_contact_task', 'get_contact_task', 'update_contact_task',
			'delete_contact_task', 'update_task_completion',
			'get_contact_notes', 'create_contact_note', 'get_contact_note', 'update_contact_note',
			'delete_contact_note',
			'upsert_contact', 'get_duplicate_contact', 'get_contacts_by_business', 'get_contact_appointments',
			'bulk_update_contact_tags', 'bulk_update_contact_business',
			'add_contact_followers', 'remove_contact_followers',
			'add_contact_to_campaign', 'remove_contact_from_campaign', 'remove_contact_from_all_campaigns',
			'add_contact_to_workflow', 'remove_contact_from_workflow'
		];
		return contactToolNames.includes(toolName);
	}
	
	private isConversationTool(toolName: string): boolean {
		const conversationToolNames = [
			'send_sms', 'send_email', 'search_conversations', 'get_conversation',
			'create_conversation', 'update_conversation', 'delete_conversation', 'get_recent_messages',
			'get_email_message', 'get_message', 'upload_message_attachments', 'update_message_status',
			'add_inbound_message', 'add_outbound_call',
			'get_message_recording', 'get_message_transcription', 'download_transcription',
			'cancel_scheduled_message', 'cancel_scheduled_email',
			'live_chat_typing'
		];
		return conversationToolNames.includes(toolName);
	}
	
	private isBlogTool(toolName: string): boolean {
		const blogToolNames = [
			'create_blog_post', 'update_blog_post', 'get_blog_posts', 'get_blog_sites',
			'get_blog_authors', 'get_blog_categories', 'check_url_slug'
		];
		return blogToolNames.includes(toolName);
	}
	
	private isOpportunityTool(toolName: string): boolean {
		const opportunityToolNames = [
			'search_opportunities', 'get_pipelines', 'get_opportunity', 'create_opportunity',
			'update_opportunity_status', 'delete_opportunity', 'update_opportunity', 
			'upsert_opportunity', 'add_opportunity_followers', 'remove_opportunity_followers'
		];
		return opportunityToolNames.includes(toolName);
	}
	
	private isCalendarTool(toolName: string): boolean {
		const calendarToolNames = [
			'get_calendar_groups', 'get_calendars', 'create_calendar', 'get_calendar', 'update_calendar', 
			'delete_calendar', 'get_calendar_events', 'get_free_slots', 'create_appointment', 
			'get_appointment', 'update_appointment', 'delete_appointment', 'create_block_slot', 'update_block_slot'
		];
		return calendarToolNames.includes(toolName);
	}
	
	private isEmailTool(toolName: string): boolean {
		const emailToolNames = [
			'get_email_campaigns', 'create_email_template', 'get_email_templates',
			'update_email_template', 'delete_email_template'
		];
		return emailToolNames.includes(toolName);
	}
	
	private isLocationTool(toolName: string): boolean {
		const locationToolNames = [
			'search_locations', 'get_location', 'create_location', 'update_location', 'delete_location',
			'get_location_tags', 'create_location_tag', 'get_location_tag', 'update_location_tag', 'delete_location_tag',
			'search_location_tasks',
			'get_location_custom_fields', 'create_location_custom_field', 'get_location_custom_field', 
			'update_location_custom_field', 'delete_location_custom_field',
			'get_location_custom_values', 'create_location_custom_value', 'get_location_custom_value',
			'update_location_custom_value', 'delete_location_custom_value',
			'get_location_templates', 'delete_location_template',
			'get_timezones'
		];
		return locationToolNames.includes(toolName);
	}
	
	private isEmailISVTool(toolName: string): boolean {
		return toolName === 'verify_email';
	}
	
	private isSocialMediaTool(toolName: string): boolean {
		const socialMediaToolNames = [
			'search_social_posts', 'create_social_post', 'get_social_post', 'update_social_post',
			'delete_social_post', 'bulk_delete_social_posts',
			'get_social_accounts', 'delete_social_account',
			'upload_social_csv', 'get_csv_upload_status', 'set_csv_accounts',
			'get_social_categories', 'get_social_category', 'get_social_tags', 'get_social_tags_by_ids',
			'start_social_oauth', 'get_platform_accounts'
		];
		return socialMediaToolNames.includes(toolName);
	}
	
	private isMediaTool(toolName: string): boolean {
		const mediaToolNames = ['get_media_files', 'upload_media_file', 'delete_media_file'];
		return mediaToolNames.includes(toolName);
	}
	
	private isObjectTool(toolName: string): boolean {
		const objectToolNames = [
			'get_all_objects', 'create_object_schema', 'get_object_schema', 'update_object_schema',
			'create_object_record', 'get_object_record', 'update_object_record', 'delete_object_record',
			'search_object_records'
		];
		return objectToolNames.includes(toolName);
	}
	
	private isAssociationTool(toolName: string): boolean {
		const associationToolNames = [
			'ghl_get_all_associations', 'ghl_create_association', 'ghl_get_association_by_id',
			'ghl_update_association', 'ghl_delete_association', 'ghl_get_association_by_key',
			'ghl_get_association_by_object_key', 'ghl_create_relation', 'ghl_get_relations_by_record',
			'ghl_delete_relation'
		];
		return associationToolNames.includes(toolName);
	}
	
	private isCustomFieldV2Tool(toolName: string): boolean {
		const customFieldV2ToolNames = [
			'ghl_get_custom_field_by_id', 'ghl_create_custom_field', 'ghl_update_custom_field',
			'ghl_delete_custom_field', 'ghl_get_custom_fields_by_object_key', 'ghl_create_custom_field_folder',
			'ghl_update_custom_field_folder', 'ghl_delete_custom_field_folder'
		];
		return customFieldV2ToolNames.includes(toolName);
	}
	
	private isWorkflowTool(toolName: string): boolean {
		return toolName === 'ghl_get_workflows';
	}
	
	private isSurveyTool(toolName: string): boolean {
		const surveyToolNames = ['ghl_get_surveys', 'ghl_get_survey_submissions'];
		return surveyToolNames.includes(toolName);
	}
	
	private isStoreTool(toolName: string): boolean {
		const storeToolNames = [
			'ghl_create_shipping_zone', 'ghl_list_shipping_zones', 'ghl_get_shipping_zone',
			'ghl_update_shipping_zone', 'ghl_delete_shipping_zone',
			'ghl_get_available_shipping_rates', 'ghl_create_shipping_rate', 'ghl_list_shipping_rates',
			'ghl_get_shipping_rate', 'ghl_update_shipping_rate', 'ghl_delete_shipping_rate',
			'ghl_create_shipping_carrier', 'ghl_list_shipping_carriers', 'ghl_get_shipping_carrier',
			'ghl_update_shipping_carrier', 'ghl_delete_shipping_carrier',
			'ghl_create_store_setting', 'ghl_get_store_setting'
		];
		return storeToolNames.includes(toolName);
	}
	
	private isProductsTool(toolName: string): boolean {
		const productsToolNames = [
			'ghl_create_product', 'ghl_list_products', 'ghl_get_product', 'ghl_update_product',
			'ghl_delete_product', 'ghl_create_price', 'ghl_list_prices', 'ghl_list_inventory',
			'ghl_create_product_collection', 'ghl_list_product_collections'
		];
		return productsToolNames.includes(toolName);
	}
	
	private isPaymentsTool(toolName: string): boolean {
		const paymentsToolNames = [
			'create_whitelabel_integration_provider', 'list_whitelabel_integration_providers',
			'list_orders', 'get_order_by_id',
			'create_order_fulfillment', 'list_order_fulfillments',
			'list_transactions', 'get_transaction_by_id',
			'list_subscriptions', 'get_subscription_by_id',
			'list_coupons', 'create_coupon', 'update_coupon', 'delete_coupon', 'get_coupon',
			'create_custom_provider_integration', 'delete_custom_provider_integration',
			'get_custom_provider_config', 'create_custom_provider_config', 'disconnect_custom_provider_config'
		];
		return paymentsToolNames.includes(toolName);
	}
	
	private isInvoicesTool(toolName: string): boolean {
		const invoicesToolNames = [
			'create_invoice_template', 'list_invoice_templates', 'get_invoice_template', 'update_invoice_template', 'delete_invoice_template',
			'update_invoice_template_late_fees', 'update_invoice_template_payment_methods',
			'create_invoice_schedule', 'list_invoice_schedules', 'get_invoice_schedule', 'update_invoice_schedule', 'delete_invoice_schedule',
			'schedule_invoice_schedule', 'auto_payment_invoice_schedule', 'cancel_invoice_schedule',
			'create_invoice', 'list_invoices', 'get_invoice', 'update_invoice', 'delete_invoice', 'void_invoice', 'send_invoice',
			'record_invoice_payment', 'generate_invoice_number', 'text2pay_invoice', 'update_invoice_last_visited',
			'create_estimate', 'list_estimates', 'update_estimate', 'delete_estimate', 'send_estimate', 'create_invoice_from_estimate',
			'generate_estimate_number', 'update_estimate_last_visited',
			'list_estimate_templates', 'create_estimate_template', 'update_estimate_template', 'delete_estimate_template', 'preview_estimate_template'
		];
		return invoicesToolNames.includes(toolName);
	}
	
	/**
		* Test GHL API connection
	*/
	private async testGHLConnection(): Promise<void> {
		try {
			console.log('[GHL MCP HTTP] Testing GHL API connection...');
			const result = await this.ghlClient.testConnection();
			console.log('[GHL MCP HTTP] ✅ GHL API connection successful');
			console.log(`[GHL MCP HTTP] Connected to location: ${result.data?.locationId}`);
			} catch (error) {
			console.error('[GHL MCP HTTP] ❌ GHL API connection failed:', error);
			throw new Error(`Failed to connect to GHL API: ${error}`);
		}
	}
	
	/**
		* Start the HTTP server
	*/
	async start(): Promise<void> {
		console.log('🚀 Starting GoHighLevel MCP HTTP Server...');
		console.log('=========================================');
		
		try {
			await this.testGHLConnection();
			
			this.app.listen(this.port, '0.0.0.0', () => {
				console.log('✅ GoHighLevel MCP HTTP Server started successfully!');
				console.log(`🌐 Server running on: http://0.0.0.0:${this.port}`);
				console.log(`🔗 SSE Endpoint: http://0.0.0.0:${this.port}/sse`);
				console.log(`📋 Describe Endpoint: http://0.0.0.0:${this.port}/describe`);
				console.log(`📋 Tools Available: ${this.getAllTools().length}`);
				console.log('🎯 Ready for MCP client integration!');
				console.log('=====================================');
				
				console.log('📡 Available Endpoints:');
				console.log(`   GET  /              - Server information`);
				console.log(`   GET  /describe       - Server description and capabilities`);
				console.log(`   GET  /describe/tool/:name - Tool-specific information`);
				console.log(`   GET  /health         - Health check with server status`);
				console.log(`   GET  /capabilities   - MCP capabilities`);
				console.log(`   GET  /tools          - Complete tools listing`);
				console.log(`   GET|POST /sse        - MCP SSE connection endpoint`);
				console.log('=====================================');
			});
			
			} catch (error) {
			console.error('❌ Failed to start GHL MCP HTTP Server:', error);
			process.exit(1);
		}
	}
}

/**
	* Handle graceful shutdown
*/
function setupGracefulShutdown(): void {
	const shutdown = (signal: string) => {
		console.log(`\n[GHL MCP HTTP] Received ${signal}, shutting down gracefully...`);
		process.exit(0);
	};
	
	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

/**
	* Main entry point
*/
async function main(): Promise<void> {
	try {
		setupGracefulShutdown();
		const server = new GHLMCPHttpServer();
		await server.start();
		} catch (error) {
		console.error('💥 Fatal error:', error);
		process.exit(1);
	}
}

// Start the server
main().catch((error) => {
	console.error('Unhandled error:', error);
	process.exit(1);
});
