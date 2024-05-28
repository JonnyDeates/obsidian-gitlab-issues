import {Vault, TFile, TAbstractFile, TFolder} from "obsidian";
import { GitlabIssuesSettings } from "./settings";
import log from "./logger";
import { compile } from 'handlebars';
import defaultTemplate from './default-template';
import {ObsidianIssue} from "./types";

export default class Filesystem {

	private vault: Vault;

	private settings: GitlabIssuesSettings;

	constructor(vault: Vault, settings: GitlabIssuesSettings) {
		this.vault = vault;
		this.settings = settings;
	}

	public createOutputDirectory() {
		this.vault.createFolder(this.settings.outputDir)
			.catch((error) => {
				if (error.message !== 'Folder already exists.') {
					log('Could not create output directory');
				}
			})
		;
	}

	public purgeExistingIssues() {
		const outputDir: TAbstractFile|null = this.vault.getAbstractFileByPath(this.settings.outputDir);

		if (outputDir instanceof TFolder) {
			Vault.recurseChildren(outputDir, (existingFile: TAbstractFile) => {
				if (existingFile instanceof TFile) {
					this.vault.delete(existingFile)
						.catch(error => log(error.message));
				}
			});
		}
	}

	public processIssues(issues: Array<ObsidianIssue>)
	{
		this.vault.adapter.read(this.settings.templateFile)
			.then((rawTemplate: string) => {
				issues.map(
					(issue: ObsidianIssue) => this.writeFile(issue, compile(rawTemplate))
				);
			})
			.catch((error) => {
				issues.map(
					(issue: ObsidianIssue) => this.writeFile(issue, compile(defaultTemplate.toString()))
				);
			})
		;
	}

	private writeFile(issue: ObsidianIssue, template: HandlebarsTemplateDelegate)
	{
		this.vault.create(this.buildFileName(issue), template(issue))
			.catch((error) => log(error.message))
		;
	}

	private buildFileName(issue: ObsidianIssue): string
	{
		return this.settings.outputDir + '/' + issue.filename + '.md';
	}
}
