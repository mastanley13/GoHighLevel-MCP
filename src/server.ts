// ===== src/server.ts =====
/**
 * GoHighLevel MCP Server - Clean stdio version
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
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

dotenv.config();

class GHLMCPServer {
	private server: Server;
	private ghlClient: GHLApiClient;
	private contactTools: ContactTools;
	private conversationTools: ConversationTools;
	private blogTools: BlogTools;
	private opportunityTools: OpportunityTools;
	private calendarTools: CalendarTools;
	private emailTools: EmailTools;
	private locationTools: LocationTools;
	private emailISVTools: EmailISVTools;
	private socialMediaTools: SocialMediaTools;
	private mediaTools: MediaTools;
	private objectTools: ObjectTools;
	private associationTools: AssociationTools;
	private customFieldV2Tools: CustomFieldV2Tools;
	private workflowTools: WorkflowTools;
	private surveyTools: SurveyTools;
	private storeTools: StoreTools;
	private productsTools: ProductsTools;
	private paymentsTools: PaymentsTools;
	private invoicesTools: InvoicesTools;
	
	constructor() {
		this.server = new Server(
			{ name: 'GoHighLevel MCP Server', version: '1.0.0' },
			{ capabilities: { tools: {} } }
		);
		
		this.ghlClient = this.initializeGHLClient();
		this.initializeTools();
		this.setupHandlers();
	}
	
	private initializeGHLClient(): GHLApiClient {
		const config: GHLConfig = {
			accessToken: process.env.GHL_API_KEY || '',
			baseUrl: process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com',
			version: '2021-07-28',
			locationId: process.env.GHL_LOCATION_ID || ''
		};
		
		if (!config.accessToken || !config.locationId) {
			throw new Error('GHL_API_KEY and GHL_LOCATION_ID environment variables are required');
		}
		
		return new GHLApiClient(config);
	}
	
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
	
	private setupHandlers(): void {
		this.server.setRequestHandler(ListToolsRequestSchema, async () => {
			return { tools: this.getAllTools() };
		});
		
		this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
			const { name, arguments: args } = request.params;
			let result: any;
			
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
			
			return {
				content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
			};
		});
	}
	
	// Tool classification methods
	private isContactTool(name: string): boolean {
		return ['create_contact', 'search_contacts', 'get_contact', 'update_contact', 'add_contact_tags', 'remove_contact_tags', 'delete_contact', 'get_contact_tasks', 'create_contact_task', 'get_contact_task', 'update_contact_task', 'delete_contact_task', 'update_task_completion', 'get_contact_notes', 'create_contact_note', 'get_contact_note', 'update_contact_note', 'delete_contact_note', 'upsert_contact', 'get_duplicate_contact', 'get_contacts_by_business', 'get_contact_appointments', 'bulk_update_contact_tags', 'bulk_update_contact_business', 'add_contact_followers', 'remove_contact_followers', 'add_contact_to_campaign', 'remove_contact_from_campaign', 'remove_contact_from_all_campaigns', 'add_contact_to_workflow', 'remove_contact_from_workflow'].includes(name);
	}
	
	private isConversationTool(name: string): boolean {
		return ['send_sms', 'send_email', 'search_conversations', 'get_conversation', 'create_conversation', 'update_conversation', 'delete_conversation', 'get_recent_messages', 'get_email_message', 'get_message', 'upload_message_attachments', 'update_message_status', 'add_inbound_message', 'add_outbound_call', 'get_message_recording', 'get_message_transcription', 'download_transcription', 'cancel_scheduled_message', 'cancel_scheduled_email', 'live_chat_typing'].includes(name);
	}
	
	private isBlogTool(name: string): boolean {
		return ['create_blog_post', 'update_blog_post', 'get_blog_posts', 'get_blog_sites', 'get_blog_authors', 'get_blog_categories', 'check_url_slug'].includes(name);
	}
	
	private isOpportunityTool(name: string): boolean {
		return ['search_opportunities', 'get_pipelines', 'get_opportunity', 'create_opportunity', 'update_opportunity_status', 'delete_opportunity', 'update_opportunity', 'upsert_opportunity', 'add_opportunity_followers', 'remove_opportunity_followers'].includes(name);
	}
	
	private isCalendarTool(name: string): boolean {
		return ['get_calendar_groups', 'get_calendars', 'create_calendar', 'get_calendar', 'update_calendar', 'delete_calendar', 'get_calendar_events', 'get_free_slots', 'create_appointment', 'get_appointment', 'update_appointment', 'delete_appointment', 'create_block_slot', 'update_block_slot'].includes(name);
	}
	
	private isEmailTool(name: string): boolean {
		return ['get_email_campaigns', 'create_email_template', 'get_email_templates', 'update_email_template', 'delete_email_template'].includes(name);
	}
	
	private isLocationTool(name: string): boolean {
		return ['search_locations', 'get_location', 'create_location', 'update_location', 'delete_location', 'get_location_tags', 'create_location_tag', 'get_location_tag', 'update_location_tag', 'delete_location_tag', 'search_location_tasks', 'get_location_custom_fields', 'create_location_custom_field', 'get_location_custom_field', 'update_location_custom_field', 'delete_location_custom_field', 'get_location_custom_values', 'create_location_custom_value', 'get_location_custom_value', 'update_location_custom_value', 'delete_location_custom_value', 'get_location_templates', 'delete_location_template', 'get_timezones'].includes(name);
	}
	
	private isEmailISVTool(name: string): boolean {
		return name === 'verify_email';
	}
	
	private isSocialMediaTool(name: string): boolean {
		return ['search_social_posts', 'create_social_post', 'get_social_post', 'update_social_post', 'delete_social_post', 'bulk_delete_social_posts', 'get_social_accounts', 'delete_social_account', 'upload_social_csv', 'get_csv_upload_status', 'set_csv_accounts', 'get_social_categories', 'get_social_category', 'get_social_tags', 'get_social_tags_by_ids', 'start_social_oauth', 'get_platform_accounts'].includes(name);
	}
	
	private isMediaTool(name: string): boolean {
		return ['get_media_files', 'upload_media_file', 'delete_media_file'].includes(name);
	}
	
	private isObjectTool(name: string): boolean {
		return ['get_all_objects', 'create_object_schema', 'get_object_schema', 'update_object_schema', 'create_object_record', 'get_object_record', 'update_object_record', 'delete_object_record', 'search_object_records'].includes(name);
	}
	
	private isAssociationTool(name: string): boolean {
		return ['ghl_get_all_associations', 'ghl_create_association', 'ghl_get_association_by_id', 'ghl_update_association', 'ghl_delete_association', 'ghl_get_association_by_key', 'ghl_get_association_by_object_key', 'ghl_create_relation', 'ghl_get_relations_by_record', 'ghl_delete_relation'].includes(name);
	}
	
	private isCustomFieldV2Tool(name: string): boolean {
		return ['ghl_get_custom_field_by_id', 'ghl_create_custom_field', 'ghl_update_custom_field', 'ghl_delete_custom_field', 'ghl_get_custom_fields_by_object_key', 'ghl_create_custom_field_folder', 'ghl_update_custom_field_folder', 'ghl_delete_custom_field_folder'].includes(name);
	}
	
	private isWorkflowTool(name: string): boolean {
		return name === 'ghl_get_workflows';
	}
	
	private isSurveyTool(name: string): boolean {
		return ['ghl_get_surveys', 'ghl_get_survey_submissions'].includes(name);
	}
	
	private isStoreTool(name: string): boolean {
		return ['ghl_create_shipping_zone', 'ghl_list_shipping_zones', 'ghl_get_shipping_zone', 'ghl_update_shipping_zone', 'ghl_delete_shipping_zone', 'ghl_get_available_shipping_rates', 'ghl_create_shipping_rate', 'ghl_list_shipping_rates', 'ghl_get_shipping_rate', 'ghl_update_shipping_rate', 'ghl_delete_shipping_rate', 'ghl_create_shipping_carrier', 'ghl_list_shipping_carriers', 'ghl_get_shipping_carrier', 'ghl_update_shipping_carrier', 'ghl_delete_shipping_carrier', 'ghl_create_store_setting', 'ghl_get_store_setting'].includes(name);
	}
	
	private isProductsTool(name: string): boolean {
		return ['ghl_create_product', 'ghl_list_products', 'ghl_get_product', 'ghl_update_product', 'ghl_delete_product', 'ghl_create_price', 'ghl_list_prices', 'ghl_list_inventory', 'ghl_create_product_collection', 'ghl_list_product_collections'].includes(name);
	}
	
	private isPaymentsTool(name: string): boolean {
		return ['create_whitelabel_integration_provider', 'list_whitelabel_integration_providers', 'list_orders', 'get_order_by_id', 'create_order_fulfillment', 'list_order_fulfillments', 'list_transactions', 'get_transaction_by_id', 'list_subscriptions', 'get_subscription_by_id', 'list_coupons', 'create_coupon', 'update_coupon', 'delete_coupon', 'get_coupon', 'create_custom_provider_integration', 'delete_custom_provider_integration', 'get_custom_provider_config', 'create_custom_provider_config', 'disconnect_custom_provider_config'].includes(name);
	}
	
	private isInvoicesTool(name: string): boolean {
		return ['create_invoice_template', 'list_invoice_templates', 'get_invoice_template', 'update_invoice_template', 'delete_invoice_template', 'update_invoice_template_late_fees', 'update_invoice_template_payment_methods', 'create_invoice_schedule', 'list_invoice_schedules', 'get_invoice_schedule', 'update_invoice_schedule', 'delete_invoice_schedule', 'schedule_invoice_schedule', 'auto_payment_invoice_schedule', 'cancel_invoice_schedule', 'create_invoice', 'list_invoices', 'get_invoice', 'update_invoice', 'delete_invoice', 'void_invoice', 'send_invoice', 'record_invoice_payment', 'generate_invoice_number', 'text2pay_invoice', 'update_invoice_last_visited', 'create_estimate', 'list_estimates', 'update_estimate', 'delete_estimate', 'send_estimate', 'create_invoice_from_estimate', 'generate_estimate_number', 'update_estimate_last_visited', 'list_estimate_templates', 'create_estimate_template', 'update_estimate_template', 'delete_estimate_template', 'preview_estimate_template'].includes(name);
	}
	
	async start(): Promise<void> {
		const transport = new StdioServerTransport();
		await this.server.connect(transport);
		process.stderr.write('✅ GoHighLevel MCP Server started successfully!\n');
	}
}

function setupGracefulShutdown(): void {
	const shutdown = (signal: string) => {
		process.stderr.write(`\n[GHL MCP] Received ${signal}, shutting down gracefully...\n`);
		process.exit(0);
	};
	
	process.on('SIGINT', () => shutdown('SIGINT'));
	process.on('SIGTERM', () => shutdown('SIGTERM'));
}

async function main(): Promise<void> {
	try {
		setupGracefulShutdown();
		const server = new GHLMCPServer();
		await server.start();
	} catch (error) {
		console.error('💥 Fatal error:', error);
		process.exit(1);
	}
}

main().catch((error) => {
	console.error('Unhandled error:', error);
	process.exit(1);
});

