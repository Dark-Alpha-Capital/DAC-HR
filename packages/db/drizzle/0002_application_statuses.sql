UPDATE application SET status = 'first_round' WHERE status = 'first_round_recruiter_call';
--> statement-breakpoint
UPDATE application SET status = 'technical_round' WHERE status = 'second_round_technical_screening';
--> statement-breakpoint
UPDATE application SET status = 'offer_agreement' WHERE status = 'third_round_final_ceo';
--> statement-breakpoint
UPDATE application SET status = 'rejected' WHERE status = 'withdrawn';
