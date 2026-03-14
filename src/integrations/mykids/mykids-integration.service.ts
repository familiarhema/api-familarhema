import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class MykidsIntegrationService {
  private readonly baseUrl = 'https://web.appmykids.com.br/gileadeweb-api/api/';
  private readonly gumgaToken: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.gumgaToken = this.configService.get<string>('MYKIDS_GUMGA_TOKEN');

    if (!this.gumgaToken) {
      throw new Error('MYKIDS_GUMGA_TOKEN deve ser configurado no arquivo .env');
    }
  }

  async buscarInscritosEventos(codigoEvento: string): Promise<any> {
    try {
      const url = `${this.baseUrl}genericreport/reportconnection`;
      const params = {
        gumgaToken: this.gumgaToken,
      };
      const body = {
        "command": "ExecuteQuery",
        "connectionString": "url = jdbc:oracle:thin:@[[dbserver]]:1521/orcl;user = [[dbusergileade]];password = [[dbpwgileade]];",
        "queryString": `select * from (  SELECT unique     cri.ID as ID_CRIANCA, cri.nome as crianca,      decode (cri.dtype, 'PessoaVisitante','link','APP') as Tipo,      FLOOR (FLOOR (MONTHS_BETWEEN (SYSDATE, cri.dt_nascimento)) / 12) as IDADE,      cri.NECESS_ESPECIAIS_INFO as nce,      I.STATUS_PAGAMENTO as status, res.ID ID_RESPONSAVEL, res.nome as responsavel, res.dtype as TIPO_RESPONSAVEL, to_char(cri.DT_NASCIMENTO,'dd/mm/yyyy') as DT_NASCIMENTO_CRIANCA, cri.SEXO as SEXO_CRIANCA,  to_char(res.DT_NASCIMENTO,'dd/mm/yyyy') as DT_NASCIMENTO_RESPONSAVEL, res.SEXO as SEXO_RESPONSAVEL, res.TELEFONE_PRINCIPAL,res.EMAIL_PRINCIPAL,     to_char(i.data_hora,'dd/mm/yyyy HH24:MI') as data_inscricao  FROM      KID_INSCRICAO I,      PES_PESSOA cri,      PES_PESSOA res,      PES_REUNIAO R,      KID_CLASSES C  WHERE      R.CLASSE_KIDS_ID = C.ID      AND I.REUNIAO_ID = R.ID      AND I.PESSOA_ID = cri.ID      AND I.RESPONSAVEL_ID = RES.ID      AND I.OI = '[[oi]]'      AND R.KID_EVENTO_ID = ${codigoEvento}      and cri.dtype in ('PessoaCadastro','PessoaTemporaria','PessoaVisitante')         and res.dtype in ('PessoaCadastro','PessoaTemporaria','PessoaVisitante')        ORDER BY      crianca  )  where      IDADE >= 0      and IDADE <= 15`,
        "database": "Oracle",
        "dataSource": "GS_GILEADEWEB_CEL_CELULA",
        "connection": "gileadeweb",
        "event": "BeginProcessData",
        "sender": "Viewer",
        "rnd": 0.589083519493158
      };

      const { data } = await firstValueFrom(
        this.httpService.post(url, body, {
          params,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        })
      );

      // Transformar rows em array de objetos
      if (data.success && data.rows && data.columns) {
        const transformedRows = data.rows.map((row: any[]) => {
          const obj: any = {};
          data.columns.forEach((col: string, index: number) => {
            obj[col] = row[index];
          });
          return obj;
        });
        return {
          success: data.success,
          data: transformedRows,
        };
      }

      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao buscar inscritos no evento no MyKids',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }

  async cancelarInscricao(idInscricao: string): Promise<any> {
    try {
      const url = `${this.baseUrl}inscricao-kids/multi`;
      const params = {
        ids: idInscricao,
      };

      const { data } = await firstValueFrom(
        this.httpService.delete(url, {
          params,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            gumgaToken: this.gumgaToken,
          },
        })
      );

      return data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new HttpException(
          error.response?.data?.message || 'Erro ao cancelar inscrição no MyKids',
          error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw error;
    }
  }
}